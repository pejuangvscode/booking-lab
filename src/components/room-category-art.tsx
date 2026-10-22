/**
 * Illustrations for the two room categories on /book-room, each showing the
 * room itself rather than a generic people or building glyph.
 *
 * Drawn flat: solid fills, no outlines, chunky well-rounded shapes. Depth comes
 * from tones of a single hue — a darker band at the base of an object, lighter
 * faces on top, a white glint — and a slight tilt plus a few floating pills
 * keep it lively. Each drawing stays inside its category's colour family (blue
 * for student labs, orange for staff rooms), so the colour keeps its meaning.
 *
 * Both share a 120 × 96 viewBox drawn at 1:1, and tilt a little further when
 * the surrounding card (a `group`) is hovered.
 */

type ArtProps = { className?: string };

const svgProps = {
  viewBox: "0 0 120 96",
  "aria-hidden": true,
};

const hoverTilt =
  "transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100 motion-reduce:group-hover:rotate-0";

/** Computer lab: a big monitor, a second one behind it, keyboard in front. */
export function StudentLabArt({ className = "" }: ArtProps) {
  return (
    <svg {...svgProps} className={`${hoverTilt} group-hover:-rotate-3 ${className}`}>
      {/* Floating pills */}
      <rect x={4} y={12} width={12} height={6} rx={3} transform="rotate(-35 10 15)" className="fill-blue-300" />
      <rect x={104} y={70} width={12} height={6} rx={3} transform="rotate(30 110 73)" className="fill-blue-300" />
      <circle cx={109} cy={58} r={2.5} className="fill-blue-200" />

      {/* Second monitor, further back */}
      <g transform="rotate(8 86 31)">
        <rect x={66} y={16} width={40} height={30} rx={9} className="fill-blue-700" />
        <rect x={71} y={21} width={30} height={19} rx={5} className="fill-blue-400" />
      </g>

      {/* Main monitor */}
      <g transform="rotate(-6 44 52)">
        {/* Stand */}
        <rect x={38} y={66} width={12} height={11} className="fill-blue-700" />
        <rect x={28} y={75} width={32} height={8} rx={4} className="fill-blue-600" />
        {/* Body: the darker layer shows through as a band along the base */}
        <rect x={12} y={24} width={64} height={46} rx={13} className="fill-blue-600" />
        <rect x={12} y={24} width={64} height={38} rx={13} className="fill-blue-500" />
        {/* Screen */}
        <rect x={19} y={31} width={50} height={27} rx={8} className="fill-blue-100" />
        <rect x={23} y={34} width={10} height={3} rx={1.5} className="fill-white" />
        <rect x={25} y={40} width={22} height={5} rx={2.5} className="fill-blue-300" />
        <rect x={25} y={48} width={30} height={5} rx={2.5} className="fill-blue-300" />
        <circle cx={60} cy={42.5} r={3.5} className="fill-blue-400" />
      </g>

      {/* Keyboard */}
      <rect x={46} y={82} width={52} height={9} rx={4.5} className="fill-blue-200" />
      <rect x={52} y={85} width={7} height={3} rx={1.5} className="fill-blue-300" />
      <rect x={62} y={85} width={7} height={3} rx={1.5} className="fill-blue-300" />
      <rect x={72} y={85} width={7} height={3} rx={1.5} className="fill-blue-300" />
      <rect x={82} y={85} width={10} height={3} rx={1.5} className="fill-blue-300" />
    </svg>
  );
}

/** Meeting room: a presentation screen, a long table, chairs behind it. */
export function StaffRoomArt({ className = "" }: ArtProps) {
  return (
    <svg {...svgProps} className={`${hoverTilt} group-hover:rotate-3 ${className}`}>
      {/* Floating pills */}
      <rect x={104} y={10} width={12} height={6} rx={3} transform="rotate(35 110 13)" className="fill-orange-300" />
      <rect x={4} y={40} width={12} height={6} rx={3} transform="rotate(-30 10 43)" className="fill-orange-300" />
      <circle cx={12} cy={24} r={2.5} className="fill-orange-200" />

      {/* Presentation screen */}
      <g transform="rotate(6 60 27)">
        <rect x={28} y={6} width={64} height={42} rx={12} className="fill-orange-600" />
        <rect x={28} y={6} width={64} height={35} rx={12} className="fill-orange-500" />
        <rect x={35} y={13} width={50} height={24} rx={7} className="fill-orange-100" />
        <rect x={39} y={16} width={9} height={3} rx={1.5} className="fill-white" />
        {/* A small bar chart on the slide */}
        <rect x={43} y={26} width={6} height={7} rx={2} className="fill-orange-300" />
        <rect x={52} y={20} width={6} height={13} rx={2} className="fill-orange-400" />
        <rect x={61} y={23} width={6} height={10} rx={2} className="fill-orange-300" />
        <rect x={70} y={17} width={6} height={16} rx={2} className="fill-orange-400" />
      </g>

      {/* Chairs on the far side of the table */}
      <rect x={16} y={52} width={22} height={22} rx={8} className="fill-orange-700" />
      <rect x={49} y={52} width={22} height={22} rx={8} className="fill-orange-700" />
      <rect x={82} y={52} width={22} height={22} rx={8} className="fill-orange-700" />

      {/* Table: legs, darker front face, lighter top, a sheet of paper */}
      <rect x={20} y={76} width={7} height={14} rx={3.5} className="fill-orange-700" />
      <rect x={93} y={76} width={7} height={14} rx={3.5} className="fill-orange-700" />
      <rect x={10} y={68} width={100} height={12} rx={6} className="fill-orange-600" />
      <rect x={8} y={63} width={104} height={10} rx={5} className="fill-orange-400" />
      <rect x={40} y={65} width={16} height={4} rx={2} className="fill-white" />
    </svg>
  );
}
