import { RegisterForm } from '@/components/register-form'

export default function RegisterPage() {
  return (
    <main className="relative flex min-h-dvh items-center justify-center px-4 py-12">
      <div className="flex w-full max-w-md flex-col items-center gap-8">
        <div className="animate-fade-in text-center">
          <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
            Empieza a registrar
          </h1>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground text-pretty">
            Tu historial de horas y tarifas queda solo en tu cuenta.
          </p>
        </div>
        <RegisterForm />
      </div>
    </main>
  )
}
