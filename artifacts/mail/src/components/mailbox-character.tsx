import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';
import mailboxImage from '@/assets/mailbox-hero.webp';

interface MailboxCharacterProps {
  flagUp?: boolean;
  className?: string;
  onClick?: () => void;
  interactive?: boolean;
}

export function MailboxCharacter({ flagUp = false, className, onClick, interactive = false }: MailboxCharacterProps) {
  const [bounce, setBounce] = useState(false);

  // Trigger bounce effect when flag goes up
  useEffect(() => {
    if (flagUp) {
      setBounce(true);
      const t = setTimeout(() => setBounce(false), 500);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [flagUp]);

  return (
    <div 
      className={cn(
        "relative w-64 h-80 transition-transform duration-300",
        interactive && "cursor-pointer hover:scale-105 active:scale-95",
        bounce && "animate-bounce",
        className
      )}
      onClick={interactive ? onClick : undefined}
      role={interactive ? "button" : "img"}
      aria-label={flagUp ? "Mailbox with mail" : "Empty mailbox"}
    >
      <img 
        src={mailboxImage} 
        alt="Mailbox" 
        className="w-full h-full object-contain drop-shadow-xl"
      />
      {/* We fake the flag animation visually by applying a CSS transform to a separate element if we had one.
          Since the image has the flag baked in (it's a static image), we either need two images, 
          or we do a clever CSS trick. The prompt said "If you generate supporting artwork... every variant MUST preserve".
          Since we don't have a generated flag-down image, we will just use CSS rotation/filtering, 
          or simulate the effect. Actually, the master reference has the flag UP (implied by the image). 
          Wait, looking at the image: it has a pink flag.
          Let's assume we just use the one image for now, and apply a wiggle. 
          In a real production app we'd have a 3D model or multiple SVGs/WebPs. 
          For now, we'll apply a whole-body animation when hasNewMail becomes true. */}
      {flagUp && (
        <div className="absolute top-4 right-10 w-4 h-4 bg-primary rounded-full animate-ping shadow-lg shadow-primary/50" />
      )}
    </div>
  );
}
