/**
 * DeleteAccountButton
 * Sets a cross-subdomain cookie and opens app.emergent.sh in a new tab
 * Uses both cookie AND URL parameter for maximum compatibility
 */
import React from 'react';

export const DeleteAccountButton = ({ 
  label = 'Delete Your Account',
  variant = 'danger' // kept for backward compatibility but not used for text style
}) => {
  const handleDeleteAccount = (e) => {
    e.preventDefault();
    
    try {
      // Set cross-subdomain cookie
      const cookieString = [
        'account_deletion_request=true',
        'Domain=.emergent.sh',
        'Path=/',
        'SameSite=None',
        'Secure',
        'Max-Age=3600'
      ].join('; ');
      
      document.cookie = cookieString;
      
      // Open app.emergent.sh in new tab with URL parameter
      const targetUrl = 'https://app.emergent.sh?action=delete_account';
      window.open(targetUrl, '_blank', 'noopener,noreferrer');
      
    } catch (error) {
      // Silently fail - no alert
    }
  };

  return (
    <a
      href="#"
      onClick={handleDeleteAccount}
      className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-950 dark:hover:text-white underline transition-colors cursor-pointer"
    >
      {label}
    </a>
  );
};

export default DeleteAccountButton;
