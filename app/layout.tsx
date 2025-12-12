import React from 'react';

export const metadata = {
  title: 'Water & Grow',
  description: 'A real-time couples water tracker.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <script src="https://cdn.tailwindcss.com"></script>
        <script src="https://js.stripe.com/v3/"></script>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
        <style dangerouslySetInnerHTML={{ __html: `
          body {
            font-family: 'Inter', sans-serif;
            background-color: #f8fafc;
            color: #0f172a;
            min-height: 100vh;
          }

          /* Subtle Grid Background */
          .bg-grid {
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            z-index: -1;
            background-image: 
              linear-gradient(to right, rgba(203, 213, 225, 0.3) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(203, 213, 225, 0.3) 1px, transparent 1px);
            background-size: 40px 40px;
            mask-image: radial-gradient(circle at 50% 50%, black, transparent);
            pointer-events: none;
          }

          @keyframes float {
            0% { transform: translateY(0px); }
            50% { transform: translateY(-5px); }
            100% { transform: translateY(0px); }
          }
          .animate-float {
            animation: float 5s ease-in-out infinite;
          }

          @keyframes grow {
            0% { transform: scale(0.95); opacity: 0.8; }
            100% { transform: scale(1); opacity: 1; }
          }
          .animate-grow {
            animation: grow 0.4s cubic-bezier(0.16, 1, 0.3, 1);
          }

          .tech-panel {
            background: rgba(255, 255, 255, 0.85);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            border: 1px solid #e2e8f0;
            box-shadow: 
              0 4px 6px -1px rgba(0, 0, 0, 0.05), 
              0 2px 4px -1px rgba(0, 0, 0, 0.03);
          }
          
          .tech-input {
            background: transparent;
            border-bottom: 2px solid #e2e8f0;
            transition: all 0.2s ease;
          }
          .tech-input:focus {
            border-color: #0f172a;
            outline: none;
          }

          .no-scrollbar::-webkit-scrollbar {
            display: none;
          }
          .no-scrollbar {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
        `}} />
      </head>
      <body>
        <div className="bg-grid"></div>
        {children}
      </body>
    </html>
  );
}
