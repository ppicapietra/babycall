# Baby Call WebApp

A modern, web-based baby monitoring solution that transforms any smartphone into a baby monitor. No special hardware required - just use your existing devices on a local WiFi network.

## 🌟 Features

- **Local Network Only**: Works entirely on your local WiFi network - no internet connection required
- **Real-time Monitoring**: Live audio and video streaming between devices
- **Multiple Viewers**: Support for unlimited viewers while maintaining a single transmitter
- **YouTube Integration**: Control YouTube playback on the transmitter from any viewer
- **Night Mode**: Reduces environmental light for better night-time monitoring
- **Secure**: All communication stays within your local network

## 🛠️ Technical Stack

- **WebSocket**: Real-time signaling and communication
- **WebRTC**: Peer-to-peer audio/video streaming
- **Express**: Backend server implementation
- **Modern Web Technologies**: Built with the latest web standards

## 📋 Prerequisites

- A local WiFi network
- Modern web browser (Chrome, Firefox, Safari, or Edge)
- At least two devices (one for transmitting, one or more for viewing)

## 🚀 Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/ppicapietra/baby-call-webapp.git
   cd baby-call-webapp
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Start the server:

   ```bash
   npm start
   ```

4. To access the application see the terminal for the url or the QR to scan from a mobile device

## 💻 Usage

1. **Transmitter Setup**:
   - Open the app on the device you want to use as the transmitter
   - Grant camera and microphone permissions
   - Click on the button "Transmitir"

2. **Viewer Setup**:
   - Open the app on any device you want to use as a viewer
   - Enter the transmitter's room code
   - Start monitoring

3. **YouTube Control**:
   - From any viewer device, enter a YouTube URL
   - Control playback (play/pause) remotely

## 🔧 Configuration

The application can be configured through environment variables:

```env
PORT=3000
WS_PORT=8080
```

## 📝 License

This project is licensed under the Creative Commons License. You are free to use, modify, and distribute this software for any purpose, as long as it helps others.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## ⚠️ Disclaimer

This application is not a replacement for professional baby monitoring equipment. Always ensure proper supervision of children.
