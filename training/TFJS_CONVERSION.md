# TensorFlow.js conversion (Google Colab/Linux)

This converts the trained model only; it does not train or modify its weights.

1. Upload or mount the Marudham 360 project in Google Colab.
2. Run:

```bash
pip install "tensorflow==2.17.1" "tensorflowjs==4.22.0"
python training/convert_to_tfjs.py \
  --model public/models/crop-disease/crop_disease_mobilenetv2.keras \
  --classes public/models/crop-disease/classes.json \
  --output public/models/crop-disease/tfjs
```

3. Copy the generated `tfjs/` directory back to the same project path on Windows.

The converter verifies that the inference-only graph matches the saved Keras model before writing `model.json` and weight shard `.bin` files.
