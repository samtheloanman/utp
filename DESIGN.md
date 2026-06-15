# Design System: uBTC / UTP Token Launch

## 1. Visual Identity & Theme
* **Vibe:** Premium, Dark Mode, Futuristic, High-End FinTech, Cyberpunk elements.
* **Core Motif:** 3D elements, glassmorphism, glowing neon accents against deep dark backgrounds. High contrast is required to make the components look cinematic and expensive.

## 2. Color Palette
* **Backgrounds:** Deep Space Black (`#06080B`), Dark Charcoal (`#12161A`).
* **Primary Accent (Bitcoin):** Bitcoin Gold (`#F7931A`) - Used for wealth, vaults, and uBTC references.
* **Secondary Accent (Quantum):** Quantum Neon Cyan (`#00E5FF`) - Used for technology, quantum resistance, and tech-driven UI borders.
* **Tertiary Accent (Utopia/UTP):** Utopian Emerald (`#00FF66`) - Used for voting, earnings, and the self-sustaining city vision.
* **Text:** Bright White (`#FFFFFF`) for primary headings, Slate Gray (`#8A96A8`) for body text.

## 3. Typography
* **Headings:** Bold, expanded Sans-Serif (e.g., Space Grotesk, Inter, or Syncopate). Should look monumental.
* **Body:** Clean Sans-Serif (e.g., Inter, Roboto).
* **Hierarchy:** Massive, oversized hero headlines. Distinct font weights to separate labels from data.

## 4. UI Elements & Effects
* **Cards (Bento Grid):** Use Glassmorphism (dark semi-transparent backgrounds with backdrop-blur, subtle 1px glowing borders in Cyan or Gold).
* **Buttons:** 
  * Primary: Solid neon glowing gradients or stark white with black text.
  * Secondary: Outlined with glowing hover states.
* **Shadows:** Avoid flat shadows. Use deep, colored glows under important elements to simulate light emission.

## 5. Imagery & Assets
* **Hero Visuals:** High fidelity 3D renders. Concepts: A glowing quantum vault, a floating Bitcoin dissolving into data nodes, or a dark futuristic city skyline.
* **Icons:** Sleek, minimalist stroke icons, optionally glowing.

## 6. Design System Notes for Stitch Generation
* Apply a strict dark mode theme with #06080B as the main background.
* Use glassmorphic panels for all feature cards (backdrop blur + 1px rgba(255,255,255,0.1) borders).
* Incorporate neon accents (#F7931A for BTC, #00E5FF for Tech, #00FF66 for Voting/Nature) sparingly as glows, text gradients, or button backgrounds.
* Ensure typography is massive and high-contrast for section headers.
* Use bento-box style grids for the feature section to keep the layout modern and structured.
