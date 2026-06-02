import { registerRootComponent } from 'expo';
import App from './App';

// Vexsora boots from a single root component (offline-first, no router needed
// for the core terminal experience). registerRootComponent handles both the
// native AppRegistry call and the web root mount.
registerRootComponent(App);
