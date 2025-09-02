import nociSymbol from "@/assets/images/noci-symbol.png";
import { Link } from "wouter";

const Logo = ({ size = 28 }: { size?: number }) => {
  return (
    <Link href="/">
      <div className={`w-${Math.floor(size/4)} h-${Math.floor(size/4)} flex items-center justify-center cursor-pointer transition-all duration-300 ease-out hover:scale-105 hover:brightness-110 hover:drop-shadow-[0_0_12px_rgba(59,130,246,0.4)]`} style={{ width: `${size}px`, height: `${size}px` }}>
        <img
          src={nociSymbol}
          alt="NOCI Logo"
          width={size}
          height={size}
          className="object-contain"
        />
      </div>
    </Link>
  );
};

export default Logo;