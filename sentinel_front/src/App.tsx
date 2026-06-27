import { Outlet, RouterProvider } from 'react-router-dom';
import { router } from './utils/router';
import { ThemeProvider } from './utils/store/themeContext';
import './App.css';

export function AppContent() {
  return (
    <div
      style={{
        minHeight: "100vh",
        overflow: "hidden",
      }}
    >
      <Outlet />
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <RouterProvider router={router} />
    </ThemeProvider>
  );
}

export default App;
