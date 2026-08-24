import { useState, useEffect, type FormEvent } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Lock, User, Eye, EyeOff, AlertCircle } from 'lucide-react'
import { useAuthStore } from '@/store/auth-store'

interface LoginDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function LoginDialog({ open, onOpenChange }: LoginDialogProps) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const login = useAuthStore((s) => s.login)

  // Reset inputs and error whenever modal opens or closes
  useEffect(() => {
    if (!open) {
      setUsername('')
      setPassword('')
      setError('')
      setShowPassword(false)
    }
  }, [open])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    if (!username.trim()) {
      setError('يرجى إدخال اسم المستخدم')
      return
    }
    if (!password.trim()) {
      setError('يرجى إدخال كلمة المرور')
      return
    }

    setIsLoading(true)
    try {
      const result = await login(username.trim(), password.trim())
      if (result.success) {
        setUsername('')
        setPassword('')
        setError('')
        onOpenChange(false)
      } else {
        setError(result.error || 'اسم المستخدم أو كلمة المرور غير صحيحة')
      }
    } catch {
      setError('حدث خطأ أثناء تسجيل الدخول، يرجى المحاولة مرة أخرى')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-md p-6 bg-white text-slate-900 border border-slate-200 shadow-2xl rounded-2xl"
        dir="rtl"
      >
        <DialogHeader className="text-right space-y-2">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center mb-1 text-emerald-700 shadow-xs">
            <Lock className="h-7 w-7" />
          </div>
          <DialogTitle className="text-xl font-bold text-center text-slate-900">
            تسجيل الدخول للوحة التحكم
          </DialogTitle>
          <DialogDescription className="text-center text-xs text-slate-500">
            أدخل بيانات حساب الإدارة للوصول إلى المنتجات والطلبات والمخزون
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="login-username" className="text-xs font-semibold text-slate-700">
              اسم المستخدم
            </Label>
            <div className="relative">
              <User className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                id="login-username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="أدخل اسم المستخدم"
                className="pr-10 bg-white border-slate-300 text-slate-900 text-sm h-10 placeholder:text-slate-400"
                dir="ltr"
                autoComplete="username"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="login-password" className="text-xs font-semibold text-slate-700">
              كلمة المرور
            </Label>
            <div className="relative">
              <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="pr-10 pl-10 bg-white border-slate-300 text-slate-900 text-sm h-10 placeholder:text-slate-400"
                dir="ltr"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-11 text-sm rounded-xl shadow-md transition cursor-pointer"
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                جاري التحقق...
              </div>
            ) : (
              'دخول للوحة الإدارة'
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
