import { LoginForm } from '@/components/login-form'

export default function LoginPage() {
  return (
    <main className="relative flex min-h-dvh items-center justify-center px-4 py-12">
      <div className="flex w-full max-w-md flex-col items-center gap-8">
        <div className="animate-fade-in text-center">
          <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
            Control de horas
          </h1>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground text-pretty">
            Tarifas, retención y cobro neto en un solo sitio.
          </p>
        </div>
        <LoginForm />
      </div>
    </main>
  )
}
