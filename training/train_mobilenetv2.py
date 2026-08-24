"""Train and export Marudham 360's MobileNetV2 classifier from the local dataset."""

from __future__ import annotations

import argparse
import faulthandler
import hashlib
import json
import os
import platform
from pathlib import Path

# These must be set before TensorFlow is imported. They avoid native oneDNN and
# excessive thread-pool failures seen in some Windows CPU TensorFlow installs.
if platform.system() == "Windows":
    os.environ.setdefault("TF_ENABLE_ONEDNN_OPTS", "0")
    os.environ.setdefault("OMP_NUM_THREADS", "1")
    os.environ.setdefault("TF_NUM_INTRAOP_THREADS", "1")
    os.environ.setdefault("TF_NUM_INTEROP_THREADS", "1")

import numpy as np
import tensorflow as tf
from PIL import Image
from sklearn.metrics import classification_report, confusion_matrix
from sklearn.model_selection import train_test_split

try:
    import tensorflowjs as tfjs

    TFJS_AVAILABLE = True
except ImportError:
    tfjs = None
    TFJS_AVAILABLE = False
    print(
        "TensorFlow.js converter is not installed. "
        "Training will continue and the Keras model will still be saved."
    )

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
IMAGE_SIZE = 224


def configure_runtime() -> None:
    faulthandler.enable(all_threads=True)
    if platform.system() == "Windows":
        tf.config.threading.set_intra_op_parallelism_threads(1)
        tf.config.threading.set_inter_op_parallelism_threads(1)


def inspect_dataset(dataset_dir: Path) -> tuple[list[Path], list[str], dict]:
    files: list[Path] = []
    labels: list[str] = []
    invalid: list[str] = []
    duplicates: list[str] = []
    hash_groups: dict[str, list[tuple[Path, str]]] = {}
    counts: dict[str, int] = {}
    conflicting_labels: list[dict] = []

    class_dirs = sorted(
        path
        for crop in dataset_dir.iterdir()
        if crop.is_dir()
        for path in crop.iterdir()
        if path.is_dir()
    )

    for class_dir in class_dirs:
        class_name = class_dir.name
        counts[class_name] = 0

        for path in sorted(class_dir.iterdir()):
            if not path.is_file() or path.suffix.lower() not in IMAGE_EXTENSIONS:
                continue

            try:
                with Image.open(path) as image:
                    image.verify()

                digest = hashlib.sha256(path.read_bytes()).hexdigest()

            except Exception:
                invalid.append(str(path))
                continue

            hash_groups.setdefault(digest, []).append((path, class_name))

    for group in hash_groups.values():
        group_labels = sorted({label for _, label in group})

        # Same exact image appears under multiple labels.
        # Remove the entire conflicting group to avoid label leakage.
        if len(group_labels) > 1:
            conflicting_labels.append(
                {
                    "labels": group_labels,
                    "files": [str(path) for path, _ in group],
                }
            )
            continue

        path, class_name = group[0]

        files.append(path)
        labels.append(class_name)
        counts[class_name] += 1

        for duplicate_path, _ in group[1:]:
            duplicates.append(f"{duplicate_path} == {path}")

    report = {
        "dataset": str(dataset_dir),
        "class_counts_after_validation_and_deduplication": counts,
        "valid_unique_images": len(files),
        "invalid_files": invalid,
        "exact_duplicates_removed": duplicates,
        "conflicting_cross_class_duplicate_groups_removed": conflicting_labels,
    }

    return files, labels, report


def decode_image(
    path: tf.Tensor,
    label: tf.Tensor,
) -> tuple[tf.Tensor, tf.Tensor]:
    image = tf.io.decode_image(
        tf.io.read_file(path),
        channels=3,
        expand_animations=False,
    )

    image.set_shape([None, None, 3])

    image = tf.image.resize(
        image,
        [IMAGE_SIZE, IMAGE_SIZE],
    )

    return tf.cast(image, tf.float32), label


def make_dataset(
    paths: list[Path],
    labels: np.ndarray,
    batch_size: int,
    training: bool,
) -> tf.data.Dataset:
    string_paths = [str(path) for path in paths]

    dataset = tf.data.Dataset.from_tensor_slices(
        (string_paths, labels)
    )

    if training:
        dataset = dataset.shuffle(
            len(paths),
            seed=42,
            reshuffle_each_iteration=True,
        )

    dataset = dataset.map(decode_image, num_parallel_calls=1)

    dataset = dataset.batch(batch_size)

    options = tf.data.Options()
    options.deterministic = True
    options.threading.private_threadpool_size = 1
    options.threading.max_intra_op_parallelism = 1
    dataset = dataset.with_options(options).prefetch(1)

    return dataset


def build_model(
    class_count: int,
    use_augmentation: bool = True,
) -> tuple[tf.keras.Model, tf.keras.Model]:
    augmentation = tf.keras.Sequential(
        [
            tf.keras.layers.RandomFlip("horizontal"),
            tf.keras.layers.RandomRotation(0.06),
            tf.keras.layers.RandomZoom(0.10),
            tf.keras.layers.RandomContrast(0.12),
        ],
        name="field_augmentation",
    )

    backbone = tf.keras.applications.MobileNetV2(
        input_shape=(IMAGE_SIZE, IMAGE_SIZE, 3),
        include_top=False,
        weights="imagenet",
    )

    backbone.trainable = False

    inputs = tf.keras.Input(
        shape=(IMAGE_SIZE, IMAGE_SIZE, 3),
        name="image",
    )

    x = augmentation(inputs) if use_augmentation else inputs

    x = tf.keras.applications.mobilenet_v2.preprocess_input(x)

    x = backbone(
        x,
        training=False,
    )

    x = tf.keras.layers.GlobalAveragePooling2D()(x)

    x = tf.keras.layers.Dropout(0.25)(x)

    outputs = tf.keras.layers.Dense(
        class_count,
        activation="softmax",
        name="probabilities",
    )(x)

    model = tf.keras.Model(
        inputs=inputs,
        outputs=outputs,
        name="cropsense_mobilenetv2",
    )

    return model, backbone


def run_diagnostics(
    train_ds: tf.data.Dataset,
    class_count: int,
    use_augmentation: bool,
    run_eagerly: bool,
) -> None:
    """Force each first-batch operation separately so native crashes are locatable."""
    print("\n[diagnostic 1/9] Pulling and materializing one decoded batch...", flush=True)
    images, labels = next(iter(train_ds))
    images_np = images.numpy()
    labels_np = labels.numpy()
    print(
        f"  images={images_np.shape} dtype={images_np.dtype} "
        f"range=({images_np.min():.1f}, {images_np.max():.1f}); "
        f"labels={labels_np.shape} range=({labels_np.min()}, {labels_np.max()})",
        flush=True,
    )

    print("[diagnostic 2/9] Building model...", flush=True)
    model, backbone = build_model(class_count, use_augmentation=use_augmentation)
    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=1e-3),
        loss="sparse_categorical_crossentropy",
        metrics=["accuracy"],
        run_eagerly=run_eagerly,
    )

    print("[diagnostic 3/9] Running augmentation only...", flush=True)
    if use_augmentation:
        augmented = model.get_layer("field_augmentation")(images, training=True)
        print(f"  augmentation output={augmented.numpy().shape}", flush=True)
    else:
        print("  augmentation disabled", flush=True)

    print("[diagnostic 4/9] Running frozen MobileNetV2 forward pass...", flush=True)
    prepared = tf.keras.applications.mobilenet_v2.preprocess_input(images)
    features = backbone(prepared, training=False)
    print(f"  backbone output={features.numpy().shape}", flush=True)

    print("[diagnostic 5/9] Running complete model eager forward pass...", flush=True)
    eager_output = model(images, training=False)
    print(f"  model output={eager_output.numpy().shape}", flush=True)

    print("[diagnostic 6/9] Running predict_on_batch (compiled inference)...", flush=True)
    prediction = model.predict_on_batch(images)
    print(f"  prediction output={np.asarray(prediction).shape}", flush=True)

    print("[diagnostic 7/9] Running eager gradient calculation...", flush=True)
    with tf.GradientTape() as tape:
        training_output = model(images, training=True)
        loss = tf.reduce_mean(
            tf.keras.losses.sparse_categorical_crossentropy(labels, training_output)
        )
    gradients = tape.gradient(loss, model.trainable_variables)
    for gradient in gradients:
        if gradient is not None:
            gradient.numpy()
    print(f"  loss={float(loss.numpy()):.6f}; gradients materialized", flush=True)

    print("[diagnostic 8/9] Applying optimizer update...", flush=True)
    model.optimizer.apply_gradients(
        (gradient, variable)
        for gradient, variable in zip(gradients, model.trainable_variables)
        if gradient is not None
    )
    print("  optimizer update completed", flush=True)

    print("[diagnostic 9/9] Running compiled train_on_batch...", flush=True)
    result = model.train_on_batch(images, labels, return_dict=True)
    print(f"  train_on_batch result={result}", flush=True)
    print("\nAll diagnostic operations completed successfully.", flush=True)


def main() -> None:
    parser = argparse.ArgumentParser()

    parser.add_argument(
        "--dataset",
        type=Path,
        required=True,
    )

    parser.add_argument(
        "--output",
        type=Path,
        default=Path("public/models/crop-disease"),
    )

    parser.add_argument(
        "--epochs",
        type=int,
        default=20,
    )

    parser.add_argument(
        "--fine-tune-epochs",
        type=int,
        default=5,
    )

    parser.add_argument(
        "--batch-size",
        type=int,
        default=32,
    )

    parser.add_argument(
        "--diagnose-only",
        action="store_true",
        help="Run one-batch decode/forward/backward checks and exit without training.",
    )

    parser.add_argument(
        "--run-eagerly",
        action="store_true",
        help="Use eager Keras training to bypass graph tracing while diagnosing native Windows failures.",
    )

    parser.add_argument(
        "--skip-augmentation",
        action="store_true",
        help="Disable augmentation to isolate preprocessing-layer crashes.",
    )

    args = parser.parse_args()

    configure_runtime()
    tf.keras.utils.set_random_seed(42)

    if not args.dataset.exists():
        raise FileNotFoundError(
            f"Dataset directory does not exist: {args.dataset}"
        )

    args.output.mkdir(
        parents=True,
        exist_ok=True,
    )

    print("\nInspecting dataset...")

    files, labels, dataset_report = inspect_dataset(
        args.dataset
    )

    usable_counts = {
        name: labels.count(name)
        for name in sorted(set(labels))
    }

    # Classes with too few trustworthy images cannot be stratified reliably.
    excluded = {
        name: count
        for name, count in usable_counts.items()
        if count < 8
    }

    if excluded:
        print("\nExcluding classes with insufficient valid samples:")

        for name, count in excluded.items():
            print(f"  {name}: {count}")

        kept = [
            (path, label)
            for path, label in zip(files, labels)
            if label not in excluded
        ]

        files = [
            path
            for path, _ in kept
        ]

        labels = [
            label
            for _, label in kept
        ]

    dataset_report[
        "classes_excluded_for_insufficient_unique_non_conflicting_images"
    ] = excluded

    classes = sorted(set(labels))

    if len(classes) < 2:
        raise ValueError(
            "At least two valid dataset classes are required."
        )

    class_to_index = {
        name: index
        for index, name in enumerate(classes)
    }

    encoded = np.array(
        [
            class_to_index[label]
            for label in labels
        ],
        dtype=np.int32,
    )

    print("\nClasses used for training:")

    for class_name in classes:
        print(
            f"  {class_name}: "
            f"{labels.count(class_name)} images"
        )

    print(
        f"\nTotal usable images: {len(files)}"
    )

    train_paths, temp_paths, train_y, temp_y = train_test_split(
        files,
        encoded,
        test_size=0.25,
        random_state=42,
        stratify=encoded,
    )

    val_paths, test_paths, val_y, test_y = train_test_split(
        temp_paths,
        temp_y,
        test_size=0.5,
        random_state=42,
        stratify=temp_y,
    )

    dataset_report["split"] = {
        "train": len(train_paths),
        "validation": len(val_paths),
        "test": len(test_paths),
    }

    dataset_report_path = (
        args.output / "dataset_report.json"
    )

    classes_path = (
        args.output / "classes.json"
    )

    dataset_report_path.write_text(
        json.dumps(
            dataset_report,
            indent=2,
        ),
        encoding="utf-8",
    )

    classes_path.write_text(
        json.dumps(
            classes,
            indent=2,
        ),
        encoding="utf-8",
    )

    print("\nDataset split:")

    print(
        f"  Training:   {len(train_paths)}"
    )

    print(
        f"  Validation: {len(val_paths)}"
    )

    print(
        f"  Test:       {len(test_paths)}"
    )

    train_ds = make_dataset(
        train_paths,
        train_y,
        args.batch_size,
        True,
    )

    val_ds = make_dataset(
        val_paths,
        val_y,
        args.batch_size,
        False,
    )

    test_ds = make_dataset(
        test_paths,
        test_y,
        args.batch_size,
        False,
    )

    if args.diagnose_only:
        run_diagnostics(
            train_ds,
            len(classes),
            use_augmentation=not args.skip_augmentation,
            run_eagerly=args.run_eagerly,
        )
        return

    print("\nBuilding MobileNetV2 model...")

    model, backbone = build_model(
        len(classes),
        use_augmentation=not args.skip_augmentation,
    )

    model.compile(
        optimizer=tf.keras.optimizers.Adam(
            learning_rate=1e-3
        ),
        loss="sparse_categorical_crossentropy",
        metrics=["accuracy"],
        run_eagerly=args.run_eagerly,
    )

    callbacks = [
        tf.keras.callbacks.EarlyStopping(
            monitor="val_loss",
            patience=4,
            restore_best_weights=True,
        ),
        tf.keras.callbacks.ReduceLROnPlateau(
            monitor="val_loss",
            patience=2,
            factor=0.3,
            min_lr=1e-7,
        ),
    ]

    print("\nStarting feature-extraction training...")

    history = model.fit(
        train_ds,
        validation_data=val_ds,
        epochs=args.epochs,
        callbacks=callbacks,
        shuffle=False,
    )

    if args.fine_tune_epochs > 0:
        print("\nStarting fine-tuning...")

        backbone.trainable = True

        # Keep most of MobileNetV2 frozen.
        # Fine-tune only the last 30 layers.
        for layer in backbone.layers[:-30]:
            layer.trainable = False

        model.compile(
            optimizer=tf.keras.optimizers.Adam(
                learning_rate=1e-5
            ),
            loss="sparse_categorical_crossentropy",
            metrics=["accuracy"],
            run_eagerly=args.run_eagerly,
        )

        fine_history = model.fit(
            train_ds,
            validation_data=val_ds,
            epochs=args.fine_tune_epochs,
            callbacks=callbacks,
            shuffle=False,
        )

        for key, values in fine_history.history.items():
            history.history[
                f"fine_tune_{key}"
            ] = [
                float(value)
                for value in values
            ]

    print("\nEvaluating model on test data...")

    test_loss, test_accuracy = model.evaluate(
        test_ds,
        verbose=0,
    )

    probabilities = model.predict(
        test_ds,
        verbose=0,
    )

    predictions = np.argmax(
        probabilities,
        axis=1,
    )

    confusion = confusion_matrix(
        test_y,
        predictions,
    )

    report = classification_report(
        test_y,
        predictions,
        target_names=classes,
        output_dict=True,
        zero_division=0,
    )

    validation_accuracies = history.history.get(
        "val_accuracy",
        [],
    )

    metrics = {
        "validation_accuracy": (
            float(max(validation_accuracies))
            if validation_accuracies
            else None
        ),
        "test_accuracy": float(test_accuracy),
        "test_loss": float(test_loss),
        "confusion_matrix": confusion.tolist(),
        "classification_report": report,
        "history": {
            key: [
                float(value)
                for value in values
            ]
            for key, values in history.history.items()
        },
    }

    evaluation_path = (
        args.output / "evaluation.json"
    )

    evaluation_path.write_text(
        json.dumps(
            metrics,
            indent=2,
        ),
        encoding="utf-8",
    )

    print("\nSaving trained Keras model...")

    keras_model_path = (
        args.output
        / "crop_disease_mobilenetv2.keras"
    )

    model.save(
        keras_model_path
    )

    print(
        f"Keras model saved to:\n"
        f"{keras_model_path}"
    )

    if TFJS_AVAILABLE:
        print(
            "\nExporting TensorFlow.js model..."
        )

        tfjs_dir = (
            args.output / "tfjs"
        )

        tfjs_dir.mkdir(
            parents=True,
            exist_ok=True,
        )

        tfjs.converters.save_keras_model(
            model,
            tfjs_dir,
        )

        print(
            f"TensorFlow.js model exported to:\n"
            f"{tfjs_dir}"
        )

    else:
        print(
            "\nTensorFlow.js export skipped."
        )

        print(
            "The trained .keras model is safe. "
            "You can convert it to TensorFlow.js later "
            "without retraining."
        )

    summary = {
        "classes": classes,
        "class_count": len(classes),
        "training_images": len(train_paths),
        "validation_images": len(val_paths),
        "test_images": len(test_paths),
        "validation_accuracy": (
            metrics["validation_accuracy"]
        ),
        "test_accuracy": (
            metrics["test_accuracy"]
        ),
        "keras_model": str(
            keras_model_path
        ),
        "tfjs_exported": TFJS_AVAILABLE,
    }

    print("\nTraining complete:\n")

    print(
        json.dumps(
            summary,
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
