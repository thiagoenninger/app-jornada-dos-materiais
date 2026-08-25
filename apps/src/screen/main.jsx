import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import ScreenApp from './ScreenApp'

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <ScreenApp/>
    </StrictMode>
)