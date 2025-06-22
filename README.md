# SAVR-SCAN

SAVR-SCAN is a modern web application built with Next.js that helps users digitize and analyze their receipts using advanced OCR (Optical Character Recognition) and AI technologies. The app features both file upload and live scanning capabilities to make receipt digitization as convenient as possible.

## Features

- **Live Receipt Scanning**: Real-time camera-based receipt scanning
- **Image Upload**: Support for uploading receipt images
- **Advanced OCR**: Powered by Google Vision OCR for accurate text extraction
- **AI Receipt Parsing**: Intelligent parsing of receipt data including:
  - Store information
  - Item details
  - Prices
  - Dates
- **Image Preprocessing**: Automatic image enhancement for better OCR results
- **Firebase Integration**: Cloud storage and database for receipt management
- **Modern UI**: Built with React and Tailwind CSS

## Tech Stack

- Next.js 14
- React 18
- Firebase
- TypeScript
- Tailwind CSS
- Canvas API for image processing

## Prerequisites

- Node.js (Latest LTS version recommended)
- npm or yarn
- Firebase account and project setup
- Google Cloud Vision API credentials

## Installation

1. Clone the repository:
```bash
git clone [your-repo-url]
cd savr-scan
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Set up your environment variables:
Create a `.env.local` file in the root directory and add your Firebase and Google Cloud credentials:
```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
GOOGLE_CLOUD_VISION_API_KEY=your_vision_api_key
```

## Development

Run the development server:

```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Project Structure

- `/app` - Next.js app directory
  - `/api` - API routes including Google Vision OCR integration
  - `/components` - React components including LiveScanner
  - `/lib` - Utility functions and business logic
  - `/receipts` - Receipt-related pages and components

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the terms of the license included in the repository.

## Support

For support, please open an issue in the GitHub repository.
