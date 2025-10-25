import { AccountSettings } from '@/components/dashboard/AccountSettings';

export default function Account() {
  return (
    <div className="min-h-screen bg-gradient-subtle p-8">
      <div className="container mx-auto max-w-6xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">
            Mon Compte
          </h1>
          <p className="text-muted-foreground text-lg">
            Gérez vos informations personnelles
          </p>
        </div>

        <AccountSettings />
      </div>
    </div>
  );
}