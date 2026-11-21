'use strict';

/* Line icons for every cardio activity. 48x48 grid, drawn side-on facing right.
   Each entry is just the inner SVG shapes; machineIcon() wraps them. */
const MACHINE_ICONS = {
  'Running': `
    <circle cx="30" cy="9" r="3.5"/>
    <path d="M28 15 L22 27 L29 33 L27 42"/>
    <path d="M22 27 L15 34 L8 32"/>
    <path d="M27 17 L34 22 L39 19"/>
    <path d="M26 18 L19 22 L15 18"/>`,

  'Walking': `
    <circle cx="26" cy="8" r="3.5"/>
    <path d="M26 14 L25 28"/>
    <path d="M25 28 L31 42"/>
    <path d="M25 28 L19 42 L14 42"/>
    <path d="M26 17 L32 26"/>
    <path d="M26 17 L20 26"/>`,

  'Cycling': `
    <circle cx="11" cy="32" r="8"/>
    <circle cx="37" cy="32" r="8"/>
    <path d="M11 32 L19 16 H31 L37 32"/>
    <path d="M19 16 L24 32 L31 16"/>
    <path d="M24 32 H11"/>
    <path d="M15 13 H22"/>
    <path d="M31 16 L29 11 H34"/>`,

  'Swimming': `
    <circle cx="34" cy="13" r="3.5"/>
    <path d="M8 24 L28 20 L34 22"/>
    <path d="M18 22 L22 12 L28 10"/>
    <path d="M4 33 q5 -5 10 0 t10 0 t10 0 t10 0"/>
    <path d="M4 42 q5 -5 10 0 t10 0 t10 0 t10 0"/>`,

  'Treadmill': `
    <rect x="4" y="36" width="34" height="6" rx="3"/>
    <path d="M8 36 V33"/>
    <path d="M34 36 L30 12"/>
    <path d="M22 10 H34"/>
    <path d="M22 10 L25 14"/>
    <rect x="25" y="3" width="10" height="5" rx="1.5"/>`,

  'Stationary Bike': `
    <path d="M6 43 H42"/>
    <path d="M14 43 L17 17"/>
    <path d="M11 16 H21"/>
    <path d="M17 17 L22 31 H33"/>
    <circle cx="32" cy="34" r="6"/>
    <path d="M33 31 L35 12"/>
    <path d="M31 12 H40"/>
    <rect x="30" y="4" width="9" height="5" rx="1.5"/>`,

  'Spin Bike': `
    <path d="M6 43 H42"/>
    <path d="M12 43 L15 17"/>
    <path d="M9 16 H19"/>
    <path d="M15 17 L26 32"/>
    <circle cx="33" cy="32" r="9"/>
    <circle cx="33" cy="32" r="2"/>
    <path d="M33 23 L36 10"/>
    <path d="M32 10 H42"/>
    <path d="M26 32 L20 40"/>`,

  'Recumbent Bike': `
    <path d="M6 43 H42"/>
    <path d="M8 13 L10 29"/>
    <path d="M10 29 H22"/>
    <path d="M16 29 V43"/>
    <path d="M22 29 L33 27"/>
    <circle cx="36" cy="30" r="5"/>
    <path d="M36 25 V20"/>
    <path d="M22 19 H30"/>
    <path d="M18 29 V19"/>`,

  'Air Bike': `
    <path d="M6 43 H42"/>
    <path d="M10 43 L13 20"/>
    <path d="M8 19 H18"/>
    <path d="M13 20 L24 32"/>
    <circle cx="32" cy="30" r="11"/>
    <path d="M32 19 V41 M21 30 H43 M24 22 L40 38 M40 22 L24 38"/>
    <path d="M22 13 L17 27"/>
    <path d="M19 12 H25"/>`,

  'Rowing': `
    <path d="M4 40 H40"/>
    <rect x="12" y="34" width="9" height="4" rx="2"/>
    <path d="M16 34 V24"/>
    <circle cx="16" cy="19" r="3.5"/>
    <path d="M16 24 L26 28"/>
    <circle cx="39" cy="31" r="6"/>
    <path d="M33 31 H24"/>
    <path d="M30 40 L32 24"/>`,

  'Ski Erg': `
    <path d="M8 43 H40"/>
    <path d="M24 43 V14"/>
    <circle cx="24" cy="9" r="6"/>
    <path d="M20 14 L14 32"/>
    <path d="M28 14 L34 32"/>
    <path d="M10 32 H18 M30 32 H38"/>`,

  'Elliptical': `
    <path d="M4 42 H44"/>
    <circle cx="12" cy="34" r="5"/>
    <path d="M12 34 L32 38"/>
    <path d="M34 42 L31 11"/>
    <path d="M31 11 L23 30"/>
    <path d="M26 11 H36"/>
    <rect x="22" y="22" width="11" height="4" rx="2" transform="rotate(14 27 24)"/>`,

  'Arc Trainer': `
    <path d="M4 42 H44"/>
    <path d="M8 36 Q22 22 36 36"/>
    <path d="M34 42 L31 11"/>
    <path d="M31 11 L24 26"/>
    <path d="M26 11 H36"/>
    <circle cx="10" cy="37" r="3"/>`,

  'Stair Climber': `
    <path d="M5 42 H15 V34 H23 V26 H31 V18 H43"/>
    <path d="M30 16 V6 H40"/>
    <path d="M36 6 V16"/>`,

  'Stair Mill': `
    <path d="M4 42 H14 V34 H22 V26 H30 V18 H36"/>
    <path d="M42 14 A10 10 0 0 1 42 36"/>
    <path d="M42 36 L37 36 M42 36 L42 41"/>
    <path d="M42 14 L37 14 M42 14 L42 9"/>`,

  'Stepper': `
    <path d="M6 43 H42"/>
    <rect x="9" y="29" width="14" height="5" rx="2"/>
    <rect x="25" y="35" width="14" height="5" rx="2"/>
    <path d="M16 29 V19 L24 12"/>
    <path d="M32 35 V23 L24 12"/>
    <path d="M24 12 V5 M18 5 H30"/>`,

  'Upper Body Ergometer': `
    <path d="M10 43 H38"/>
    <path d="M24 43 V30"/>
    <rect x="12" y="26" width="24" height="5" rx="2"/>
    <circle cx="24" cy="15" r="9"/>
    <path d="M17.6 21.4 L30.4 8.6"/>
    <circle cx="30.4" cy="8.6" r="2.6"/>
    <circle cx="17.6" cy="21.4" r="2.6"/>`,

  'Vertical Climber': `
    <path d="M6 43 H42"/>
    <path d="M18 43 V8"/>
    <path d="M30 43 V8"/>
    <path d="M12 12 H22"/>
    <path d="M26 20 H36"/>
    <path d="M12 34 H22"/>
    <path d="M26 28 H36"/>
    <path d="M18 8 H30"/>`,

  "Jacob's Ladder": `
    <path d="M8 43 L34 5"/>
    <path d="M16 43 L42 5"/>
    <path d="M12 38 H21 M17 30 H26 M23 22 H32 M29 14 H38"/>`,

  'Jump Rope': `
    <path d="M12 12 C-2 46 50 46 36 12"/>
    <rect x="9" y="6" width="6" height="12" rx="3"/>
    <rect x="33" y="6" width="6" height="12" rx="3"/>`,

  // Used for activities you add yourself.
  '_generic': `
    <circle cx="24" cy="27" r="14"/>
    <path d="M24 27 V18"/>
    <path d="M24 27 L30 31"/>
    <path d="M19 6 H29"/>
    <path d="M24 6 V13"/>`,
};

function machineIcon(name, size = 40) {
  const body = MACHINE_ICONS[name] || MACHINE_ICONS._generic;
  return `<svg class="mi" width="${size}" height="${size}" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
}
