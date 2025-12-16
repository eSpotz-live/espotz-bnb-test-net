import { Link } from 'react-router-dom';

export function Footer() {
  const socialLinks = [
    {
      name: 'Facebook',
      image: '/banners/Facebook.png',
      url: '#',
      alt: 'Follow Espotz on Facebook'
    },
    {
      name: 'Twitter',
      image: '/banners/Twitter.png',
      url: '#',
      alt: 'Follow Espotz on Twitter'
    },
    {
      name: 'LinkedIn',
      image: '/banners/Linkedin.png',
      url: '#',
      alt: 'Follow Espotz on LinkedIn'
    },
    {
      name: 'YouTube',
      image: '/banners/Youtube.png',
      url: '#',
      alt: 'Subscribe to Espotz on YouTube'
    }
  ];

  return (
    <footer className="bg-espotz-dark-gray border-t border-gray-800 mt-auto">
      <div className="container mx-auto px-4 py-8">
        {/* Social Media Banners */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-4 text-center">Follow Us</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {socialLinks.map((social) => (
              <a
                key={social.name}
                href={social.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-lg overflow-hidden hover:opacity-80 transition-opacity"
              >
                <img
                  src={social.image}
                  alt={social.alt}
                  className="w-full h-auto"
                />
              </a>
            ))}
          </div>
        </div>

        {/* Footer Info */}
        <div className="border-t border-gray-800 pt-6 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
            {/* About */}
            <div>
              <h4 className="font-semibold mb-3">About Espotz</h4>
              <p className="text-gray-400">
                The premier esports prediction marketplace on BNB Smart Chain.
                Trade on your favorite esports outcomes and compete in tournaments.
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="font-semibold mb-3">Quick Links</h4>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <Link to="/tournaments" className="hover:text-cyan-400 transition">
                    Tournaments
                  </Link>
                </li>
                <li>
                  <Link to="/markets" className="hover:text-cyan-400 transition">
                    Markets
                  </Link>
                </li>
                <li>
                  <Link to="/portfolio" className="hover:text-cyan-400 transition">
                    Portfolio
                  </Link>
                </li>
                <li>
                  <Link to="/admin" className="hover:text-cyan-400 transition">
                    Admin
                  </Link>
                </li>
              </ul>
            </div>

            {/* Network Info */}
            <div>
              <h4 className="font-semibold mb-3">Network</h4>
              <p className="text-gray-400 mb-2">
                Built on BNB Smart Chain Testnet
              </p>
              <div className="flex items-center gap-2 text-gray-400">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-xs">Chain ID: 97</span>
              </div>
            </div>
          </div>

          {/* Copyright */}
          <div className="text-center mt-8 pt-6 border-t border-gray-800 text-gray-500 text-sm">
            <p>&copy; {new Date().getFullYear()} Espotz. All rights reserved.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
