import { FaXTwitter, FaGithub, FaBolt } from "react-icons/fa6";
import { PrimalIcon } from "./primal-icon";

export function Footer() {
  return (
    <footer className="border-t border-synthwave-neon-orange/30 py-10 mt-auto relative z-10">
      <div className="w-full px-5 text-center flex flex-col items-center">
        <div className="mb-10">
          <h3 className="text-sm font-bold text-synthwave-neon-cyan mb-3 uppercase tracking-wider">
            Projects & Links
          </h3>
          <div className="flex flex-col gap-2">
            <a
              href="https://pq-bitcoin.org"
              target="_blank"
              rel="noopener noreferrer"
              className="text-synthwave-neon-green hover:text-synthwave-neon-orange transition-all duration-300"
            >
              pq-bitcoin.org
            </a>
          </div>
        </div>
        <div className="flex justify-center items-center gap-6 mb-10">
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
            <PrimalIcon size={24} />
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
        <div className="mb-6">
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