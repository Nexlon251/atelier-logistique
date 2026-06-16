import { AppShell } from './src/shell/AppShell';
import { AppProvider } from './src/context/AppContext';
import { SectorProvider } from './src/context/SectorContext';

export default function App() {
  return (
    <AppProvider>
      <SectorProvider>
        <AppShell />
      </SectorProvider>
    </AppProvider>
  );
}
