# ParkPass

ParkPass is a smart parking platform for both users and parking lot owners.  
It allows users to search, book, and pay for parking spots online, while owners can manage their parking spaces efficiently through a web application.

## Features

- Search and book parking spots near you
- View parking spot details and reviews
- Real-time booking and confirmation system
- Online payment via QR code and bank transfer
- Owners can add, edit, and manage their parking spots
- User and owner profile management
- Booking and payment status notifications
- Mobile-friendly and installable as a Progressive Web App (PWA)

## Technology Stack

- React + TypeScript
- Vite
- Supabase (Database & Auth)
- Tailwind CSS
- Vite PWA Plugin

## Getting Started

1. **Install dependencies**
   ```
   npm install
   ```

2. **Create a `.env` file and add your Supabase credentials**
   ```env
   VITE_SUPABASE_URL=your-supabase-url
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

3. **Run the project**
   ```
   npm run dev
   ```

4. **Open** [http://localhost:5173](http://localhost:5173) **in your browser**

## Project Structure

- `src/` - Main application source code
- `public/` - Static files, manifest, icons
- `README.md` - Project documentation

## Notes

- This project supports PWA installation (Add to Home Screen)
- Make sure to configure Supabase and enable Row Level Security (RLS) with appropriate policies

---

> Developed by Tortrakul Bunruam