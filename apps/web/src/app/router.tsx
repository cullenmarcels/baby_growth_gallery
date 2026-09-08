import { createBrowserRouter } from 'react-router-dom';
import { StatusPage } from './StatusPage';

export const router = createBrowserRouter([
  { path: '/', element: <StatusPage /> },
  { path: '*', element: <StatusPage /> },
]);
