import { RouterProvider, createHashRouter } from 'react-router';
import { UpdatePrompt } from '../pwa/UpdatePrompt';
import { routes } from './routes';

// Routage par hash (#/calendrier) : fonctionne sur GitHub Pages et hors ligne sans
// configuration serveur, y compris quand l'app est rouverte sur un écran précis.
const router = createHashRouter(routes);

export function App() {
  return (
    <>
      <RouterProvider router={router} />
      <UpdatePrompt />
    </>
  );
}
