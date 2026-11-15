import './globals.css';
import Nav from './components/Nav';

export const metadata = {
  title: 'AI Calling Dashboard',
  description: 'Upload lists, schedule AI calls, and review results',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Nav />
        <main className="main">{children}</main>
      </body>
    </html>
  );
}
