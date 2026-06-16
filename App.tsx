import { AppShell } from './src/shell/AppShell';
import { AppProvider } from './src/context/AppContext';

export default function App() {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  );
}
