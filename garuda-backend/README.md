# 🌍 Satellite Change Detection Using Sentinel-2 and CNN

## 📌 Overview

This project demonstrates a deep learning-based application for detecting land use or environmental changes over time using Sentinel-2 satellite imagery. A U-Net Convolutional Neural Network (CNN) model is used to identify changes between two satellite images, with an interactive Gradio-based interface allowing users to select any global location.

## 🧠 Model Summary

* **Architecture**: U-Net
* **Input**: Concatenated before and after satellite images (RGB, 128x128)
* **Output**: Binary change mask (highlighting detected change regions)
* **Framework**: TensorFlow / Keras

## 🛰️ Data Source

* **Satellite Provider**: Sentinel-2 (via Sentinel Hub)
* **Bands Used**: B04 (Red), B03 (Green), B02 (Blue)
* **Image Resolution Options**: 10m, 5m, 2.5m
* **Cloud Filtering**: Only images with 0% cloud coverage are used

## 🔧 Features

* 🌐 Input any city or region name
* 📏 Choose zoom level (City-Wide, Block-Level, or Zoomed-In)
* 🖼️ Select image resolution
* 🧭 Automatic selection of two cloud-free Sentinel-2 images
* 🧠 CNN-based binary change mask prediction
* 🎨 Overlay mask + contours on post-change image for clarity
* 💬 Change statistics displayed (changed pixels %)
* 🖥️ Gradio interface for interactive use

## 🚀 Getting Started Locally

### 1. Clone the repository

```bash
git clone https://github.com/your-username/change-detection-app.git
cd change-detection-app
```

### 2. Set up Python environment

```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 3. Add Sentinel Hub credentials

Create a `.env` file in the root directory:

```
CLIENT_ID=your_sentinel_hub_client_id
CLIENT_SECRET=your_sentinel_hub_client_secret
```

### 4. Launch the app

```bash
python app.py
```

The app will launch on `http://localhost:7860` in your browser.

## 📸 Example Output

* Before Image  |  After Image  |  Predicted Mask
  \:--------------:|:-------------:|:----------------:
  ![Before](samples/before.png) | ![After](samples/after.png) | ![Overlay](samples/overlay.png)

## 📚 File Structure

```
├── app.py                   # Main Gradio app
├── unet_model.h5            # Pre-trained U-Net model
├── requirements.txt         # Dependencies
├── .env                     # Sentinel Hub credentials
├── README.md                # This file
```

## 📦 Requirements

* gradio
* tensorflow
* geopy
* pillow
* opencv-python
* python-dotenv
* sentinelhub

## 📤 Deployment

You can deploy this project to [Hugging Face Spaces](https://huggingface.co/spaces):

* Add your model and app files
* Include `requirements.txt` and `.env` setup
* App will launch automatically via Gradio

## 🙋‍♀️ Author

Murtaza Khasamwala : MS in Artificial Intelligence

---

## 💡 Future Enhancements

* Draw-on-map ROI selection
* Time-lapse animations of change
* Confidence score visualization

> 🌟 If you find this useful, consider ⭐️ starring the repo!
