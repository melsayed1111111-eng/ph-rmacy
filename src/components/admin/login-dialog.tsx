import { useState, type FormEvent } from 'react'
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
import { Lock, User, Eye, EyeOff, AlertCircle, KeyRound, Info } from 'lucide-react'
import { useAuthStore } from '@/store/auth-store'

interface LoginDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function LoginDialog({ open, onOpenChange }: LoginDialogProps) {
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('admin123')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const login = useAuthStore((s) => s.login)

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
        onOpenChange(false)
      } else {
        setError(result.error || 'اسم المستخدم أو كلمة المرور غير صحيحة')
      }
    } catch {
      setError('حدث خطأ أثناء تسجيل الدخول')
    } finally {
      setIsLoading(false)
    }
  }

  const fillDefaultCredentials = () => {
    setUsername('admin')
    setPassword('admin123')
    setError('')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-6 bg-white text-slate-900 border border-slate-200 shadow-2xl rounded-2xl" dir="rtl">
        <DialogHeader className="text-right space-y-2">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-emerald-100 border border-emerald-200 flex items-center justify-center mb-1 text-emerald-700 shadow-sm">
            <Lock className="h-7 w-7" />
          </div>
          <DialogTitle className="text-xl font-bold text-center text-slate-900">
            تسجيل الدخول للوحة التحكم
          </DialogTitle>
          <DialogDescription className="text-center text-xs text-slate-500">
            أدخل بيانات الإدارة للوصول لإدارة المنتجات والطلبات والمخزون
          </DialogDescription>
        </DialogHeader>

        {/* Credentials Reminder Box */}
        <div className="bg-emerald-50/90 border border-emerald-200 rounded-xl p-3 text-xs space-y-1.5 text-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-semibold text-emerald-900">
              <KeyRound className="h-4 w-4 text-emerald-700" />
              <span>بيانات الدخول الافتراضية:</span>
            </div>
            <button
              type="button"
              onClick={fillDefaultCredentials}
              className="text-[11px] font-medium text-emerald-700 hover:text-emerald-900 underline underline-offset-2"
            >
              تعبئة تلقائية
            </button>
          </div>
          <div className="flex items-center justify-between text-slate-700 pt-1 font-mono text-[11px] bg-white/80 px-2.5 py-1.5 rounded-lg border border-emerald-100">
            <span>المستخدم: <strong className="text-emerald-900 font-bold">admin</strong></span>
            <span>كلمة المرور: <strong className="text-emerald-900 font-bold">admin123</strong></span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="login-username" className="text-xs font-semibold text-slate-700">اسم المستخدم</Label>
            <div className="relative">
              <User className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                id="login-username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                className="pr-10 bg-white border-slate-300 text-slate-900 text-sm h-10"
                dir="ltr"
                autoComplete="username"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="login-password" className="text-xs font-semibold text-slate-700">كلمة المرور</Label>
            <div className="relative">
              <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="pr-10 pl-10 bg-white border-slate-300 text-slate-900 text-sm h-10"
                dir="ltr"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-11 text-sm rounded-xl shadow-md transition"
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
