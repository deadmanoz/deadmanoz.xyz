import { FaXTwitter, FaGithub, FaBolt } from "react-icons/fa6";
import { GiOstrich } from "react-icons/gi";

export function Footer() {
  return (
    <footer className="border-t border-synthwave-neon-orange/30 py-10 mt-auto relative z-10">
      <div className="w-full px-5 text-center flex flex-col items-center">
        <div className="flex justify-center items-center gap-6 mb-4">
          <a
            href="https://x.com/ozdeadman"
            target="_blank"
            rel="noopener noreferrer"
            className="text-synthwave-neon-cyan hover:text-synthwave-neon-orange transition-all duration-300 transform hover:scale-110"
            aria-label="Twitter/X"
          >
            <FaXTwitter size={24} />
          </a>
          <a
            href="https://primal.net/deadmanoz"
            target="_blank"
            rel="noopener noreferrer"
            className="text-synthwave-neon-cyan hover:text-synthwave-neon-orange transition-all duration-300 transform hover:scale-110"
            aria-label="Primal (Nostr)"
          >
            <GiOstrich size={24} />
          </a>
          <a
            href="https://github.com/deadmanoz"
            target="_blank"
            rel="noopener noreferrer"
            className="text-synthwave-neon-cyan hover:text-synthwave-neon-orange transition-all duration-300 transform hover:scale-110"
            aria-label="GitHub"
          >
            <FaGithub size={24} />
          </a>
        </div>
        <div className="my-4">
          <a
            href="lightning:fewvest88@phoenixwallet.me"
            className="inline-flex items-center gap-2 text-sm text-synthwave-neon-green hover:text-synthwave-neon-orange transition-all duration-300"
          >
            <FaBolt size={16} />
            <span>Donate via Lightning</span>
          </a>
        </div>
        <p className="text-lg text-synthwave-peach">© 2025 deadmanoz.xyz</p>
      </div>
    </footer>
  );
}