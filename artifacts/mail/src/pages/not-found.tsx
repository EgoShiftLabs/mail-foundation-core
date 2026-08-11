import { MailboxCharacter } from "@/components/mailbox-character";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background">
      <div className="flex flex-col items-center text-center max-w-md px-6">
        <MailboxCharacter flagUp={false} className="w-48 h-64 mb-8 grayscale-[50%] opacity-80" />
        
        <h1 className="text-3xl font-extrabold tracking-tight mb-3">
          WRONG ADDRESS.
        </h1>
        
        <p className="text-muted-foreground text-lg mb-8">
          The page you're looking for doesn't exist in this neighborhood.
        </p>

        <Link href="/">
          <Button size="lg" className="rounded-full font-bold tracking-widest px-8 shadow-md hover-elevate">
            <ArrowLeft className="w-5 h-5 mr-2" />
            RETURN TO FRONT PORCH
          </Button>
        </Link>
      </div>
    </div>
  );
}
