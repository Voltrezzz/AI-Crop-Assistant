"""Convert the trained CropSense Keras model to TF.js Layers format (Linux/Colab)."""

from __future__ import annotations

import argparse
import importlib.util
import json
import sys
import types
from pathlib import Path

import tensorflow as tf
import tf_keras

# tensorflowjs imports converters for unrelated model families at package load
# time. On Windows, provide harmless placeholders only when those optional
# packages are absent; Keras Layers conversion does not call them.
if importlib.util.find_spec("tensorflow_decision_forests") is None:
    sys.modules["tensorflow_decision_forests"] = types.ModuleType("tensorflow_decision_forests")
if importlib.util.find_spec("tensorflow_hub") is None:
    sys.modules["tensorflow_hub"] = types.ModuleType("tensorflow_hub")
if importlib.util.find_spec("jax") is None:
    jax_module = types.ModuleType("jax")
    jax_experimental = types.ModuleType("jax.experimental")
    jax2tf_module = types.ModuleType("jax.experimental.jax2tf")
    jax_experimental.jax2tf = jax2tf_module
    jax_module.experimental = jax_experimental
    sys.modules["jax"] = jax_module
    sys.modules["jax.experimental"] = jax_experimental
    sys.modules["jax.experimental.jax2tf"] = jax2tf_module

import tensorflowjs as tfjs


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", type=Path, required=True)
    parser.add_argument("--classes", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()

    labels = json.loads(args.classes.read_text(encoding="utf-8"))
    source = tf.keras.models.load_model(args.model, compile=False)
    if source.input_shape[1:] != (224, 224, 3):
        raise ValueError(f"Unexpected model input shape: {source.input_shape}")
    if source.output_shape[-1] != len(labels):
        raise ValueError(f"Model outputs {source.output_shape[-1]} classes but classes.json has {len(labels)}")

    # Strip training-only random augmentation and dropout. Rescaling is exactly
    # MobileNetV2 preprocess_input for RGB pixels in the [0, 255] range.
    # Build with legacy tf_keras serialization. TensorFlow.js 4.22 cannot load
    # Keras 3's object-style inbound_nodes topology even though it converts it.
    inputs = tf_keras.Input((224, 224, 3), dtype=tf.float32, name="image")
    x = tf_keras.layers.Rescaling(1.0 / 127.5, offset=-1.0, name="mobilenet_preprocess")(inputs)
    backbone = tf_keras.applications.MobileNetV2(
        input_shape=(224, 224, 3), include_top=False, weights=None
    )
    backbone.trainable = False
    x = backbone(x, training=False)
    x = tf_keras.layers.GlobalAveragePooling2D(name="global_average_pooling2d")(x)
    outputs = tf_keras.layers.Dense(len(labels), activation="softmax", name="probabilities")(x)
    inference_model = tf_keras.Model(inputs, outputs, name="cropsense_mobilenetv2_inference")
    backbone.set_weights(source.get_layer("mobilenetv2_1.00_224").get_weights())
    inference_model.get_layer("probabilities").set_weights(source.get_layer("probabilities").get_weights())

    # Prove the conversion graph matches the saved model's inference behavior.
    sample = tf.random.uniform((1, 224, 224, 3), 0, 255, dtype=tf.float32, seed=42)
    source_output = source(sample, training=False)
    inference_output = inference_model(sample, training=False)
    max_difference = float(tf.reduce_max(tf.abs(source_output - inference_output)).numpy())
    if max_difference > 1e-5:
        raise RuntimeError(f"Inference graph changed model output (max difference {max_difference})")

    args.output.mkdir(parents=True, exist_ok=True)
    tfjs.converters.save_keras_model(inference_model, args.output)
    (args.output / "classes.json").write_text(json.dumps(labels, indent=2), encoding="utf-8")
    print(f"Exported TF.js model to {args.output}")
    print(f"Verified {len(labels)} classes; max output difference: {max_difference:.8f}")


if __name__ == "__main__":
    main()
