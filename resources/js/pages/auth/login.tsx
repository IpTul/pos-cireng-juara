import { Form, Head } from '@inertiajs/react';
import InputError from '@/components/input-error';
import PasskeyVerify from '@/components/passkey-verify';
import PasswordInput from '@/components/password-input';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Store } from 'lucide-react';
// import { register } from '@/routes';
import { store } from '@/routes/login';
import { request } from '@/routes/password';

type Props = {
  status?: string;
  canResetPassword: boolean;
};

export default function Login({ status, canResetPassword }: Props) {
  return (
    <>
      <Head title="Log in" />

      {/* <PasskeyVerify /> */}

      <div className="flex flex-col gap-8">
        {/* Brand mark */}
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Store className="size-6" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              Selamat datang kembali
            </h1>
            <p className="text-sm text-muted-foreground">
              Masuk untuk melanjutkan ke Cireng Juara
            </p>
          </div>
        </div>

        <Form
          {...store.form()}
          resetOnSuccess={['password']}
          className="flex flex-col gap-5"
        >
          {({ processing, errors }) => (
            <>
              <div className="grid gap-4">
                <div className="grid gap-1.5">
                  <Label htmlFor="email">Email atau Username</Label>
                  <Input
                    id="email"
                    type="text"
                    name="email"
                    required
                    autoFocus
                    tabIndex={1}
                    autoComplete="username"
                    placeholder="Masukkan email atau username"
                    className="h-11 rounded-lg"
                  />
                  <InputError message={errors.email} />
                </div>

                <div className="grid gap-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Kata sandi</Label>
                    {canResetPassword && (
                      <TextLink
                        href={request()}
                        className="text-xs text-muted-foreground hover:text-foreground"
                        tabIndex={5}
                      >
                        Lupa kata sandi?
                      </TextLink>
                    )}
                  </div>
                  <PasswordInput
                    id="password"
                    name="password"
                    required
                    tabIndex={2}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className="h-11 rounded-lg"
                  />
                  <InputError message={errors.password} />
                </div>

                <div className="flex items-center gap-2.5 pt-1">
                  <Checkbox id="remember" name="remember" tabIndex={3} />
                  <Label
                    htmlFor="remember"
                    className="text-sm font-normal text-muted-foreground"
                  >
                    Ingat saya
                  </Label>
                </div>

                <Button
                  type="submit"
                  size="lg"
                  className="mt-2 h-11 w-full rounded-lg text-sm font-medium"
                  tabIndex={4}
                  disabled={processing}
                  data-test="login-button"
                >
                  {processing && <Spinner className="mr-2" />}
                  Masuk
                </Button>
              </div>

              {/* <div className="text-center text-sm text-muted-foreground">
                Belum punya akun?{' '}
                <TextLink href={register()} tabIndex={5}>
                  Daftar
                </TextLink>
              </div> */}
            </>
          )}
        </Form>

        {status && (
          <div className="rounded-lg bg-green-50 py-2.5 text-center text-sm font-medium text-green-600 dark:bg-green-950/40">
            {status}
          </div>
        )}
      </div>
    </>
  );
}

Login.layout = {
  title: 'Masuk ke akun Anda',
  description: 'Masukkan email atau username dan kata sandi Anda untuk masuk',
};
