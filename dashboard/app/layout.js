import './globals.css';

export const metadata = {
  title: 'LLM Regression Analyzer — Dashboard',
  description: 'Compare base vs fine-tuned LLM behavior across large benchmark sets with visual heatmaps, charts, and diagnostics.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
