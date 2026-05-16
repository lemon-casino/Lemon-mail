<template>
  <div class="login-page" v-loading="oauthLoading" element-loading-text="登录中...">
    <!-- Background decoration -->
    <div class="bg-layer">
      <div class="bg-orb bg-orb-1"></div>
      <div class="bg-orb bg-orb-2"></div>
      <div class="bg-orb bg-orb-3"></div>
      <div class="bg-grid"></div>
    </div>

    <!-- Centered card -->
    <div class="card-wrapper">
      <div class="auth-card" v-motion :initial="{ opacity: 0, y: 24, scale: 0.98 }" :enter="{ opacity: 1, y: 0, scale: 1, transition: { duration: 400 } }">
        <!-- Logo + Title -->
        <div class="card-header">
          <div class="logo-icon">
            <img v-if="siteIconUrl" :src="siteIconUrl" :alt="settingStore.settings.title" class="site-logo-image" />
            <Icon v-else icon="mingcute:mail-send-fill" width="22" height="22" />
          </div>
          <h1 class="app-name">{{ settingStore.settings.title }}</h1>
        </div>

        <!-- Heading -->
        <Transition name="hd" mode="out-in">
          <div class="card-heading" :key="show">
            <h2>{{ show === 'login' ? $t('loginTitle') : $t('regTitle') }}</h2>
            <p>{{ show === 'login' ? $t('loginSubTitle') : $t('regSubTitle') }}</p>
          </div>
        </Transition>

        <!-- Tab switcher -->
        <div class="tab-bar" v-if="settingStore.settings.register === 0">
          <button :class="['tab', show === 'login' && 'active']" @click="show = 'login'">{{ $t('loginBtn') }}</button>
          <button :class="['tab', show !== 'login' && 'active']" @click="show = 'register'">{{ $t('regBtn') }}</button>
        </div>

        <!-- Forms -->
        <Transition name="form" mode="out-in">
          <!-- LOGIN -->
          <div v-if="show === 'login'" key="login" class="fields">
            <div class="field">
              <label>{{ $t('emailAccount') }}</label>
              <div class="input-group" :class="{ 'has-suffix': settingStore.settings.loginDomain === 0 }">
                <div class="input-main">
                  <Icon class="input-icon" icon="mingcute:mail-line" width="16" height="16" />
                  <input v-model="form.email" type="text" autocomplete="off"
                    :placeholder="settingStore.settings.loginDomain === 0 ? 'username' : $t('emailAccount')" />
                </div>
                <div v-if="settingStore.settings.loginDomain === 0" class="input-suffix" @click.stop="openSelect">
                  <span>{{ suffix }}</span>
                  <Icon icon="mingcute:down-line" width="11" height="11" />
                  <el-select v-if="show === 'login'" ref="mySelect" v-model="suffix" class="hidden-select">
                    <el-option v-for="d in domainList" :key="d" :label="d" :value="d" />
                  </el-select>
                </div>
              </div>
            </div>

            <div class="field">
              <label>{{ $t('password') }}</label>
              <div class="input-main standalone">
                <Icon class="input-icon" icon="mingcute:lock-line" width="16" height="16" />
                <input v-model="form.password" :type="showPwd ? 'text' : 'password'" autocomplete="off" :placeholder="$t('password')" />
                <button class="toggle-pwd" @click="showPwd = !showPwd" type="button" tabindex="-1">
                  <Icon :icon="showPwd ? 'mingcute:eye-line' : 'mingcute:eye-close-line'" width="15" height="15" />
                </button>
              </div>
            </div>

            <button class="primary-btn" @click="submit" :disabled="loginLoading">
              <Icon v-if="loginLoading" icon="mingcute:loading-fill" class="spin" width="16" height="16" />
              <span v-else>{{ $t('loginBtn') }}</span>
            </button>

            <template v-if="settingStore.settings.linuxdoSwitch">
              <div class="divider"><span>{{ $t('orDivider') }}</span></div>
              <button class="social-btn" @click="linuxDoLogin">
                <el-avatar src="/image/linuxdo.webp" :size="16" style="flex-shrink:0" />
                <span>{{ $t('continueWith') }} LinuxDo</span>
              </button>
            </template>
          </div>

          <!-- REGISTER -->
          <div v-else key="register" class="fields">
            <div class="field">
              <label>{{ $t('emailAccount') }}</label>
              <div class="input-group has-suffix">
                <div class="input-main">
                  <Icon class="input-icon" icon="mingcute:mail-line" width="16" height="16" />
                  <input v-model="registerForm.email" type="text" autocomplete="off" placeholder="username" />
                </div>
                <div class="input-suffix" @click.stop="openSelect">
                  <span>{{ suffix }}</span>
                  <Icon icon="mingcute:down-line" width="11" height="11" />
                  <el-select v-if="show !== 'login'" ref="mySelect" v-model="suffix" class="hidden-select">
                    <el-option v-for="d in domainList" :key="d" :label="d" :value="d" />
                  </el-select>
                </div>
              </div>
            </div>

            <div class="field">
              <label>{{ $t('password') }}</label>
              <div class="input-main standalone">
                <Icon class="input-icon" icon="mingcute:lock-line" width="16" height="16" />
                <input v-model="registerForm.password" :type="showPwd ? 'text' : 'password'" autocomplete="off" :placeholder="$t('password')" />
                <button class="toggle-pwd" @click="showPwd = !showPwd" type="button" tabindex="-1">
                  <Icon :icon="showPwd ? 'mingcute:eye-line' : 'mingcute:eye-close-line'" width="15" height="15" />
                </button>
              </div>
            </div>

            <div class="field">
              <label>{{ $t('confirmPwd') }}</label>
              <div class="input-main standalone" :class="{ error: registerForm.confirmPassword && registerForm.password !== registerForm.confirmPassword }">
                <Icon class="input-icon" icon="mingcute:lock-check-line" width="16" height="16" />
                <input v-model="registerForm.confirmPassword" :type="showConfirmPwd ? 'text' : 'password'" autocomplete="off" :placeholder="$t('confirmPwd')" />
                <button class="toggle-pwd" @click="showConfirmPwd = !showConfirmPwd" type="button" tabindex="-1">
                  <Icon :icon="showConfirmPwd ? 'mingcute:eye-line' : 'mingcute:eye-close-line'" width="15" height="15" />
                </button>
              </div>
            </div>

            <div v-if="settingStore.settings.regKey === 0 || settingStore.settings.regKey === 2" class="field">
              <label>{{ settingStore.settings.regKey === 0 ? $t('regKey') : $t('regKeyOptional') }}</label>
              <div class="input-main standalone">
                <Icon class="input-icon" icon="mingcute:key-2-line" width="16" height="16" />
                <input v-model="registerForm.code" type="text" autocomplete="off"
                  :placeholder="settingStore.settings.regKey === 0 ? $t('regKey') : $t('regKeyOptional')" />
              </div>
              <div class="reg-key-tips">
                <span v-if="settingStore.settings.regKeyHint" class="reg-key-hint">{{ settingStore.settings.regKeyHint }}</span>
                <a v-if="settingStore.settings.regKeyLink" class="reg-key-link" :href="settingStore.settings.regKeyLink" target="_blank" rel="noopener noreferrer">
                  <Icon icon="mingcute:external-link-line" width="13" height="13" />
                  {{ $t('getRegKey') }}
                </a>
              </div>
            </div>

            <div v-show="verifyShow" class="register-turnstile"
              :data-sitekey="settingStore.settings.siteKey"
              data-callback="onTurnstileSuccess"
              data-error-callback="onTurnstileError"
              data-after-interactive-callback="loadAfter"
              data-before-interactive-callback="loadBefore">
              <span class="err-text" v-if="botJsError">{{ $t('verifyModuleFailed') }}</span>
            </div>

            <button class="primary-btn" @click="submitRegister" :disabled="registerLoading">
              <Icon v-if="registerLoading" icon="mingcute:loading-fill" class="spin" width="16" height="16" />
              <span v-else>{{ $t('regBtn') }}</span>
            </button>

            <template v-if="settingStore.settings.linuxdoSwitch">
              <div class="divider"><span>{{ $t('orDivider') }}</span></div>
              <button class="social-btn" @click="linuxDoLogin">
                <el-avatar src="/image/linuxdo.webp" :size="16" style="flex-shrink:0" />
                <span>{{ $t('continueWith') }} LinuxDo</span>
              </button>
            </template>
          </div>
        </Transition>
      </div>

    </div>

    <!-- OAuth bind dialog -->
    <el-dialog class="bind-dlg" v-model="showBindForm" title="绑定邮箱" :width="400">
      <div class="bind-body">
        <div class="field">
          <label>邮箱地址</label>
          <div class="input-group has-suffix">
            <div class="input-main">
              <Icon class="input-icon" icon="mingcute:mail-line" width="16" height="16" />
              <input v-model="bindForm.email" type="text" autocomplete="off" :placeholder="$t('emailAccount')" />
            </div>
            <div class="input-suffix" @click.stop="openSelect">
              <span>{{ suffix }}</span>
              <Icon icon="mingcute:down-line" width="11" height="11" />
              <el-select ref="mySelect" v-model="suffix" class="hidden-select">
                <el-option v-for="d in domainList" :key="d" :label="d" :value="d" />
              </el-select>
            </div>
          </div>
        </div>
        <div v-if="settingStore.settings.regKey === 0 || settingStore.settings.regKey === 2" class="field" style="margin-top: 4px">
          <label>{{ settingStore.settings.regKey === 0 ? $t('regKey') : $t('regKeyOptional') }}</label>
          <div class="input-main standalone">
            <Icon class="input-icon" icon="mingcute:key-2-line" width="16" height="16" />
            <input v-model="bindForm.code" type="text" autocomplete="off"
              :placeholder="settingStore.settings.regKey === 0 ? $t('regKey') : $t('regKeyOptional')" />
          </div>
        </div>
        <button class="primary-btn" style="margin-top: 16px" @click="bind" :disabled="bindLoading">
          <Icon v-if="bindLoading" icon="mingcute:loading-fill" class="spin" width="16" height="16" />
          <span v-else>绑定</span>
        </button>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import router from "@/router";
import {computed, nextTick, reactive, ref} from "vue";
import {login, register} from "@/request/login.js";
import {isEmail} from "@/utils/verify-utils.js";
import {useSettingStore} from "@/store/setting.js";
import {useAccountStore} from "@/store/account.js";
import {useUserStore} from "@/store/user.js";
import {useUiStore} from "@/store/ui.js";
import {Icon} from "@iconify/vue";
import {loginUserInfo} from "@/request/my.js";
import {permsToRouter} from "@/perm/perm.js";
import {useI18n} from "vue-i18n";
import {oauthBindUser, oauthLinuxDoLogin} from "@/request/ouath.js";
import { getSiteIconUrl } from "@/utils/branding.js";

const {t} = useI18n();
const accountStore = useAccountStore();
const userStore = useUserStore();
const uiStore = useUiStore();
const settingStore = useSettingStore();
const loginLoading = ref(false);
const bindLoading = ref(false);
const oauthLoading = ref(false);
const showBindForm = ref(false);
const show = ref('login');
const showPwd = ref(false);
const showConfirmPwd = ref(false);

const bindForm = reactive({ email: '', oauthUserId: '', code: '' });
const form = reactive({ email: '', password: '' });
const mySelect = ref();
const suffix = ref('');
const registerForm = reactive({ email: '', password: '', confirmPassword: '', code: null });
const domainList = settingStore.domainList;
const registerLoading = ref(false);
const siteIconUrl = computed(() => settingStore.settings.siteIcon ? getSiteIconUrl(settingStore.settings.siteIcon) : '');
suffix.value = domainList[0];
const verifyShow = ref(false);
let verifyToken = '';
let turnstileId = null;
const botJsError = ref(false);
let verifyErrorCount = 0;

window.onTurnstileSuccess = (token) => { verifyToken = token; };
window.onTurnstileError = (e) => {
  if (verifyErrorCount >= 4) return;
  verifyErrorCount++;
  setTimeout(() => {
    nextTick(() => {
      if (!turnstileId) turnstileId = window.turnstile.render('.register-turnstile');
      else window.turnstile.reset(turnstileId);
    });
  }, 1500);
};
window.loadAfter = () => {};
window.loadBefore = () => {};

const openSelect = () => { mySelect.value.toggleMenu(); };

function linuxDoLogin() {
  const clientId = settingStore.settings.linuxdoClientId;
  const redirectUri = encodeURIComponent(settingStore.settings.linuxdoCallbackUrl);
  window.location.href =
    `https://connect.linux.do/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=openid+profile+email`;
}

linuxDoGetUser();

async function linuxDoGetUser() {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  if (code) {
    oauthLoading.value = true;
    oauthLinuxDoLogin(code).then(data => {
      bindForm.oauthUserId = data.userInfo.oauthUserId;
      if (!data.token) {
        showBindForm.value = true;
        oauthLoading.value = false;
        ElMessage({ message: '请注册绑定一个邮箱', type: 'warning', duration: 4000, plain: true });
        return;
      }
      saveToken(data.token);
    }).catch(() => { oauthLoading.value = false; });
  }
  window.history.replaceState({}, '', window.location.origin + window.location.pathname);
}

function bind() {
  if (!bindForm.email) { ElMessage({ message: t('emptyEmailMsg'), type: 'error', plain: true }); return; }
  if (bindForm.email.length < settingStore.settings.minEmailPrefix) {
    ElMessage({ message: t('minEmailPrefix', { msg: settingStore.settings.minEmailPrefix }), type: 'error', plain: true }); return;
  }
  if (!isEmail(bindForm.email + suffix.value)) { ElMessage({ message: t('notEmailMsg'), type: 'error', plain: true }); return; }
  if (settingStore.settings.regKey === 0 && !bindForm.code) {
    ElMessage({ message: t('emptyRegKeyMsg'), type: 'error', plain: true }); return;
  }
  bindLoading.value = true;
  oauthBindUser({ email: bindForm.email + suffix.value, oauthUserId: bindForm.oauthUserId, code: bindForm.code })
    .then(data => { saveToken(data.token); })
    .catch(() => { bindLoading.value = false; });
}

const submit = () => {
  if (!form.email) { ElMessage({ message: t('emptyEmailMsg'), type: 'error', plain: true }); return; }
  const email = form.email + (settingStore.settings.loginDomain === 0 ? suffix.value : '');
  if (!isEmail(email)) { ElMessage({ message: t('notEmailMsg'), type: 'error', plain: true }); return; }
  if (!form.password) { ElMessage({ message: t('emptyPwdMsg'), type: 'error', plain: true }); return; }
  loginLoading.value = true;
  login(email, form.password)
    .then(async data => { await saveToken(data.token); })
    .finally(() => { loginLoading.value = false; });
};

async function saveToken(token) {
  localStorage.setItem('token', token);
  const user = await loginUserInfo();
  accountStore.currentAccountId = user.account.accountId;
  accountStore.currentAccount = user.account;
  userStore.user = user;
  permsToRouter(user.permKeys).forEach(r => { router.addRoute('layout', r); });
  await router.replace({ name: 'layout' });
  uiStore.showNotice();
  oauthLoading.value = false;
  bindLoading.value = false;
}

function submitRegister() {
  if (!registerForm.email) { ElMessage({ message: t('emptyEmailMsg'), type: 'error', plain: true }); return; }
  if (registerForm.email.length < settingStore.settings.minEmailPrefix) {
    ElMessage({ message: t('minEmailPrefix', { msg: settingStore.settings.minEmailPrefix }), type: 'error', plain: true }); return;
  }
  if (!isEmail(registerForm.email + suffix.value)) { ElMessage({ message: t('notEmailMsg'), type: 'error', plain: true }); return; }
  if (!registerForm.password) { ElMessage({ message: t('emptyPwdMsg'), type: 'error', plain: true }); return; }
  if (registerForm.password.length < 6) { ElMessage({ message: t('pwdLengthMsg'), type: 'error', plain: true }); return; }
  if (registerForm.password !== registerForm.confirmPassword) {
    ElMessage({ message: t('confirmPwdFailMsg'), type: 'error', plain: true }); return;
  }
  if (settingStore.settings.regKey === 0 && !registerForm.code) {
    ElMessage({ message: t('emptyRegKeyMsg'), type: 'error', plain: true }); return;
  }
  if (!verifyToken && (settingStore.settings.registerVerify === 0 || (settingStore.settings.registerVerify === 2 && settingStore.settings.regVerifyOpen))) {
    if (!verifyShow.value) {
      verifyShow.value = true;
      nextTick(() => {
        if (!turnstileId) {
          try { turnstileId = window.turnstile.render('.register-turnstile'); }
          catch { botJsError.value = true; }
        } else { window.turnstile.reset('.register-turnstile'); }
      });
    } else if (!botJsError.value) {
      ElMessage({ message: t('botVerifyMsg'), type: 'error', plain: true });
    }
    return;
  }
  registerLoading.value = true;
  register({ email: registerForm.email + suffix.value, password: registerForm.password, token: verifyToken, code: registerForm.code })
    .then(({ regVerifyOpen }) => {
      show.value = 'login';
      Object.assign(registerForm, { email: '', password: '', confirmPassword: '', code: '' });
      registerLoading.value = false;
      verifyToken = '';
      settingStore.settings.regVerifyOpen = regVerifyOpen;
      verifyShow.value = false;
      ElMessage({ message: t('regSuccessMsg'), type: 'success', plain: true });
    })
    .catch(res => {
      registerLoading.value = false;
      if (res.code === 400) {
        verifyToken = '';
        settingStore.settings.regVerifyOpen = true;
        if (turnstileId) window.turnstile.reset(turnstileId);
        else nextTick(() => { turnstileId = window.turnstile.render('.register-turnstile'); });
        verifyShow.value = true;
      }
    });
}
</script>

<style>
.el-select-dropdown__item { padding: 0 15px; }
</style>

<style lang="scss" scoped>
/* ── Full-page centered layout ── */
.login-page {
  position: relative;
  width: 100%;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  /* Light mode: 淡紫渐变背景 */
  background:
    radial-gradient(ellipse 80% 60% at 20% 0%, rgba(99,102,241,0.10) 0%, transparent 60%),
    radial-gradient(ellipse 60% 50% at 80% 100%, rgba(139,92,246,0.10) 0%, transparent 60%),
    radial-gradient(ellipse 50% 40% at 50% 50%, rgba(59,130,246,0.06) 0%, transparent 60%),
    #f7f6ff;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

:global(.dark) .login-page {
  background:
    radial-gradient(ellipse 80% 60% at 20% 0%, rgba(99,102,241,0.18) 0%, transparent 60%),
    radial-gradient(ellipse 60% 50% at 80% 100%, rgba(139,92,246,0.14) 0%, transparent 60%),
    radial-gradient(ellipse 50% 40% at 50% 50%, rgba(59,130,246,0.08) 0%, transparent 60%),
    #09090e;
}

/* ── Background decoration ── */
.bg-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

/* 渐变网格线 */
.bg-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(99,102,241,0.06) 1px, transparent 1px),
    linear-gradient(90deg, rgba(99,102,241,0.06) 1px, transparent 1px);
  background-size: 44px 44px;
  mask-image: radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%);
  -webkit-mask-image: radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%);
}

/* 装饰光晕球 */
.bg-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(72px);
}

.bg-orb-1 {
  width: 520px;
  height: 520px;
  background: radial-gradient(circle, rgba(99,102,241,0.22) 0%, transparent 70%);
  top: -180px;
  right: -80px;
  animation: orb-drift-1 14s ease-in-out infinite;
}

.bg-orb-2 {
  width: 400px;
  height: 400px;
  background: radial-gradient(circle, rgba(139,92,246,0.18) 0%, transparent 70%);
  bottom: -120px;
  left: -60px;
  animation: orb-drift-2 18s ease-in-out infinite;
}

.bg-orb-3 {
  width: 260px;
  height: 260px;
  background: radial-gradient(circle, rgba(59,130,246,0.16) 0%, transparent 70%);
  top: 35%;
  right: 18%;
  animation: orb-drift-3 22s ease-in-out infinite;
}

@keyframes orb-drift-1 {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33%       { transform: translate(-25px, 18px) scale(1.04); }
  66%       { transform: translate(12px, -22px) scale(0.97); }
}
@keyframes orb-drift-2 {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33%       { transform: translate(20px, -28px) scale(1.03); }
  66%       { transform: translate(-18px, 15px) scale(0.98); }
}
@keyframes orb-drift-3 {
  0%, 100% { transform: translate(0, 0) scale(1); }
  50%       { transform: translate(-20px, -24px) scale(1.06); }
}

/* 角落装饰色块 */
.bg-layer::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 3px;
  background: linear-gradient(90deg, #6366f1, #8b5cf6, #3b82f6);
  opacity: 0.5;
}

/* ── Card wrapper ── */
.card-wrapper {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  max-height: 100vh;
  overflow-y: auto;
  padding: 24px 16px;
}

/* ── Auth card ── */
.auth-card {
  width: 100%;
  max-width: 380px;
  background: rgba(255, 255, 255, 0.82);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.7);
  border-radius: 18px;
  padding: 28px 28px 24px;
  box-shadow:
    0 0 0 1px rgba(99, 102, 241, 0.06),
    0 4px 24px -4px rgba(99, 102, 241, 0.12),
    0 20px 60px -12px rgba(99, 102, 241, 0.10),
    0 0 0 0 transparent;

  @media (max-width: 460px) {
    padding: 22px 18px 20px;
    border-radius: 14px;
  }
}

:global(.dark) .auth-card {
  background: rgba(15, 15, 22, 0.80);
  backdrop-filter: blur(20px) saturate(150%);
  -webkit-backdrop-filter: blur(20px) saturate(150%);
  border-color: rgba(99, 102, 241, 0.15);
  box-shadow:
    0 0 0 1px rgba(99, 102, 241, 0.10),
    0 4px 24px -4px rgba(0, 0, 0, 0.4),
    0 20px 60px -12px rgba(0, 0, 0, 0.3);
}

/* ── Card header ── */
.card-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 20px;
}

.logo-icon {
  width: 34px;
  height: 34px;
  border-radius: 9px;
  background: var(--xi-gradient);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  flex-shrink: 0;
  box-shadow: 0 3px 10px rgba(99, 102, 241, 0.30);
}

.site-logo-image {
  width: 22px;
  height: 22px;
  object-fit: contain;
  display: block;
}

.app-name {
  font-size: 16px;
  font-weight: 700;
  color: var(--el-text-color-primary);
  margin: 0;
  letter-spacing: -0.02em;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

/* ── Card heading ── */
.card-heading {
  margin-bottom: 16px;

  h2 {
    margin: 0 0 3px;
    font-size: 18px;
    font-weight: 700;
    letter-spacing: -0.02em;
    color: var(--el-text-color-primary);
  }

  p {
    margin: 0;
    font-size: 12.5px;
    color: var(--el-text-color-secondary);
  }
}

/* ── Tab bar ── */
.tab-bar {
  display: flex;
  background: rgba(99, 102, 241, 0.07);
  border-radius: 8px;
  padding: 3px;
  margin-bottom: 16px;
}

.tab {
  flex: 1;
  padding: 6px 0;
  font-size: 13px;
  font-weight: 500;
  color: var(--el-text-color-secondary);
  background: transparent;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;

  &.active {
    background: var(--el-bg-color);
    color: #6366f1;
    font-weight: 600;
    box-shadow: 0 1px 4px rgba(99, 102, 241, 0.15);
  }
}

/* ── Form fields ── */
.fields {
  display: flex;
  flex-direction: column;
  gap: 11px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 4px;

  label {
    font-size: 12px;
    font-weight: 600;
    color: var(--el-text-color-secondary);
    letter-spacing: 0.01em;
  }
}

.reg-key-tips {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 2px;
}

.reg-key-hint {
  font-size: 12px;
  color: var(--el-text-color-placeholder);
}

.reg-key-link {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 12px;
  color: var(--el-color-primary);
  text-decoration: none;
  transition: opacity 0.2s;

  &:hover {
    opacity: 0.75;
    text-decoration: underline;
  }
}

/* ── Input group (email + suffix) ── */
.input-group {
  display: flex;
  border: 1px solid var(--el-border-color);
  border-radius: 9px;
  overflow: hidden;
  background: var(--el-fill-color-blank);
  transition: border-color 0.2s, box-shadow 0.2s;

  &:focus-within {
    border-color: var(--el-color-primary);
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.10);
  }

  &.has-suffix .input-main {
    border-right: 1px solid var(--el-border-color);
  }
}

.input-main {
  flex: 1;
  display: flex;
  align-items: center;
  min-width: 0;

  &.standalone {
    border: 1px solid var(--el-border-color);
    border-radius: 9px;
    background: var(--el-fill-color-blank);
    transition: border-color 0.2s, box-shadow 0.2s;

    &:focus-within {
      border-color: var(--el-color-primary);
      box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.10);
    }

    &.error {
      border-color: var(--el-color-danger);
      box-shadow: 0 0 0 3px var(--el-color-danger-light-8);
    }
  }

  input {
    flex: 1;
    height: 36px;
    padding: 0 10px 0 0;
    font-size: 13.5px;
    color: var(--el-text-color-primary);
    min-width: 0;

    &::placeholder { color: var(--el-text-color-placeholder); }
  }
}

.input-icon {
  padding: 0 7px 0 11px;
  color: var(--el-text-color-placeholder);
  flex-shrink: 0;
}

.input-suffix {
  position: relative;
  display: flex;
  align-items: center;
  gap: 3px;
  padding: 0 10px;
  cursor: pointer;
  color: var(--el-text-color-secondary);
  font-size: 12.5px;
  font-weight: 500;
  white-space: nowrap;
  flex-shrink: 0;
  transition: all 0.15s;
  user-select: none;

  &:hover {
    background: var(--el-fill-color-light);
    color: var(--el-text-color-primary);
  }

  span {
    max-width: 110px;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}

.hidden-select {
  position: absolute;
  inset: 0;
  opacity: 0;
  pointer-events: none;
  width: 100%;
}

.toggle-pwd {
  padding: 0 10px;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--el-text-color-placeholder);
  display: flex;
  align-items: center;
  transition: color 0.15s;
  flex-shrink: 0;

  &:hover { color: var(--el-text-color-primary); }
}

/* ── Primary button ── */
.primary-btn {
  width: 100%;
  height: 37px;
  border: none;
  border-radius: 9px;
  background: linear-gradient(135deg, #6366f1 0%, #7c3aed 100%);
  color: #fff;
  font-size: 13.5px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.2s;
  box-shadow: 0 2px 10px rgba(99, 102, 241, 0.28), 0 0 0 1px rgba(99,102,241,0.12);
  margin-top: 2px;
  letter-spacing: 0.01em;

  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 5px 18px rgba(99, 102, 241, 0.36), 0 0 0 1px rgba(99,102,241,0.16);
    background: linear-gradient(135deg, #4f46e5 0%, #6d28d9 100%);
  }

  &:active:not(:disabled) {
    transform: translateY(0);
    box-shadow: 0 1px 6px rgba(99, 102, 241, 0.22);
  }

  &:disabled { opacity: 0.5; cursor: not-allowed; }
}

/* ── Divider ── */
.divider {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--el-text-color-placeholder);
  font-size: 11.5px;

  &::before, &::after {
    content: '';
    flex: 1;
    height: 1px;
    background: var(--el-border-color-light);
  }
}

/* ── Social button ── */
.social-btn {
  width: 100%;
  height: 36px;
  border: 1px solid var(--el-border-color);
  border-radius: 9px;
  background: var(--el-fill-color-blank);
  color: var(--el-text-color-primary);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.15s;

  &:hover {
    background: var(--el-fill-color-light);
    border-color: var(--el-border-color-hover);
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  }
}

/* ── Utility ── */
.err-text { font-size: 12px; color: var(--el-color-danger); }
.spin { animation: spin-anim 0.7s linear infinite; }
@keyframes spin-anim { to { transform: rotate(360deg); } }

/* ── Transitions ── */
.hd-enter-active, .hd-leave-active { transition: opacity 0.2s, transform 0.2s; }
.hd-enter-from { opacity: 0; transform: translateY(6px); }
.hd-leave-to   { opacity: 0; transform: translateY(-6px); }

.form-enter-active { transition: opacity 0.22s ease, transform 0.22s ease; }
.form-leave-active { transition: opacity 0.14s ease, transform 0.14s ease; }
.form-enter-from   { opacity: 0; transform: translateX(10px); }
.form-leave-to     { opacity: 0; transform: translateX(-10px); }

/* ── Bind dialog ── */
.bind-body { display: flex; flex-direction: column; gap: 12px; }

:deep(.bind-dlg) {
  .el-dialog__body { padding-top: 4px; }
  @media (max-width: 440px) { width: calc(100% - 32px) !important; }
}

:deep(.el-input-group__append) {
  padding: 0 8px;
  background: var(--el-bg-color);
}
</style>
