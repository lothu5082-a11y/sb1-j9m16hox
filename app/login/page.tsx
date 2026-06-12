import AuthForm from "@/components/AuthForm";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col justify-center px-6 py-12">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-extrabold text-gray-900">ShopBook</h1>
        <p className="mt-2 text-gray-500">Your daily sales & expenses, in your pocket.</p>
      </div>
      <AuthForm />
      <p className="mt-6 text-center text-xs text-gray-400">
        Your data is private and synced securely across your devices.
      </p>
    </main>
  );
}
