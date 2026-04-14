import Group from "../imports/Group/Group";

interface CardProps {
  className?: string;
}

export default function Card({ className = "" }: CardProps) {
  return (
    <div
      className={`relative w-[876.72px] h-[555.36px] rounded-[20px] overflow-hidden ${className}`}
    >
      <Group />
    </div>
  );
}
