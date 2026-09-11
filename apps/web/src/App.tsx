import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Captura } from './screens/Captura';
import { Placa } from './screens/Placa';
import { EditarPerfil } from './screens/PrimerUso';
import { Hospitales } from './screens/Hospitales';
import { BaseInstalada } from './screens/BaseInstalada';
import { Consultas } from './screens/Consultas';
import { Red } from './screens/Red';
import { Rendimiento } from './screens/Rendimiento';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Navigate to="/captura" replace />} />
        <Route path="captura" element={<Captura />} />
        <Route path="captura/placa" element={<Placa />} />
        <Route path="hospitales" element={<Hospitales />} />
        <Route path="hospitales/:id" element={<Hospitales />} />
        <Route path="base" element={<BaseInstalada />} />
        <Route path="consultas" element={<Consultas />} />
        <Route path="red" element={<Red />} />
        <Route path="rendimiento" element={<Rendimiento />} />
        <Route path="perfil" element={<EditarPerfil />} />
        <Route path="*" element={<Navigate to="/captura" replace />} />
      </Route>
    </Routes>
  );
}
