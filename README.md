# Baby Call

A modern, web-based baby monitoring solution that transforms any smartphone into a baby monitor. No special hardware required - just use your existing devices on a local WiFi network.

## Requisites

- NodeJS 18+

## 🚀 Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/ppicapietra/babycall.git
   cd babycall
   code .
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Start the app:

   ```bash
   npm run start
   ```
  
   or, if you want debug tools activated:

   ```bash
   npm run dev
   ```

4. To access the application see the terminal for the url or the QR to scan from a mobile device

## 🍏 Build Installation App

To build the installation app, you can use the provided npm script. Follow these steps:

1. Ensure you have all the necessary dependencies installed:

   ```bash
   npm install
   ```

2. Run the build script for MacOS:

   ```bash
   npm run build
   ```

3. After the build process completes, you will find the installation app in the `dist/` directory. The app will be named `baby-watcher<version>-<platform>.dmg`.

## 🌟 Features

- **Local Network Only**: Works entirely on your local WiFi network - no internet connection required
- **Real-time Monitoring**: Live audio and video streaming between devices
- **Multiple Viewers**: Support for unlimited viewers while maintaining a single transmitter
- **YouTube Integration**: Control YouTube playback on the transmitter from any viewer
- **Night Mode**: Reduces environmental light for better night-time monitoring
- **Secure**: All communication stays within your local network
- **Stability**: The active WebRTC connections stay actives even if the server goes down

## 🛠️ Technical Stack

- **Electron**: Desktop-like web apps
- **WebSocket**: Real-time signaling and communication
- **WebRTC**: Peer-to-peer audio/video streaming
- **Express**: Backend server implementation
- **Modern Web Technologies**: Built with the latest web standards

## 💻 Usage

1. **Transmitter Setup**:
   - Open the app on the device you want to use as the transmitter
   - Grant camera and microphone permissions
   - Click on the button "Transmit"

2. **Viewer Setup**:
   - Open the server url on any device you want to use as a viewer
   - Click on the button "Watch"
   - Grant camera and microphone permissions (If required)

3. **YouTube Control**:
   - From any viewer device, enter a YouTube URL
   - Control playback (play/pause) remotely, broadcasting the new status to all of the others viewers

## 📝 License

This project is licensed under the Creative Commons License. You are free to use, modify, and distribute this software for any purpose, as long as it helps others.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## ⚠️ Disclaimer

This application is not a replacement for professional baby monitoring equipment. Always ensure proper supervision of children.
