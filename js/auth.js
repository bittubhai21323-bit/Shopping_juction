/* ============================================================
   Bittu Store — auth.js (login.html only)
   NOTE: Google Sign-In and Mobile OTP are simulated in the browser
   (this is a static, backend-free demo). Real OAuth and SMS delivery
   need a server — see the "Demo Mode" labels in the UI.
   ============================================================ */

function qparam(name){
  return new URLSearchParams(location.search).get(name);
}

function afterLoginRedirect(user, nextPage){
  if(user.role==='admin'){ location.href='admin/index.html'; }
  else if(user.role==='seller'){ location.href='seller/index.html'; }
  else{ location.href = nextPage ? nextPage : 'index.html'; }
}

function initAuthPage(){
  const nextPage = qparam('next');

  /* ---------------- method tabs: Email vs Mobile OTP ---------------- */
  const tabEmailMethod = document.getElementById('tab-email');
  const tabOtpMethod = document.getElementById('tab-otp');
  const methodEmail = document.getElementById('method-email');
  const methodOtp = document.getElementById('method-otp');
  tabEmailMethod.addEventListener('click', ()=>{
    tabEmailMethod.classList.add('active-tab'); tabOtpMethod.classList.remove('active-tab');
    methodEmail.style.display='block'; methodOtp.style.display='none';
  });
  tabOtpMethod.addEventListener('click', ()=>{
    tabOtpMethod.classList.add('active-tab'); tabEmailMethod.classList.remove('active-tab');
    methodOtp.style.display='block'; methodEmail.style.display='none';
  });

  /* ---------------- email login / signup sub-tabs ---------------- */
  const tabLogin = document.getElementById('tab-login');
  const tabSignup = document.getElementById('tab-signup');
  const formLogin = document.getElementById('form-login');
  const formSignup = document.getElementById('form-signup');

  function showLogin(){
    tabLogin.classList.add('active-tab');
    tabSignup.classList.remove('active-tab');
    formLogin.style.display='block';
    formSignup.style.display='none';
  }
  function showSignup(){
    tabSignup.classList.add('active-tab');
    tabLogin.classList.remove('active-tab');
    formSignup.style.display='block';
    formLogin.style.display='none';
  }
  tabLogin.addEventListener('click', showLogin);
  tabSignup.addEventListener('click', showSignup);
  if(qparam('mode')==='signup') showSignup(); else showLogin();

  /* seller checkbox pre-filled via footer "Become a Seller" link */
  const sellerCheck = document.getElementById('signup-seller-check');
  const shopGroup = document.getElementById('signup-shopname-group');
  sellerCheck.addEventListener('change', ()=>{
    shopGroup.style.display = sellerCheck.checked ? 'block' : 'none';
  });
  if(qparam('seller')==='1'){
    sellerCheck.checked = true;
    shopGroup.style.display = 'block';
  }

  formLogin.addEventListener('submit', function(e){
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim().toLowerCase();
    const pass = document.getElementById('login-password').value;
    const errEl = document.getElementById('login-error');
    const user = getUsers().find(u=>u.email.toLowerCase()===email && u.password===pass);
    if(!user){
      errEl.textContent = 'Incorrect email or password. Try again, or sign up below.';
      errEl.style.display='block';
      return;
    }
    setSession(user.id);
    toast('Welcome back, ' + user.name.split(' ')[0] + '!');
    setTimeout(()=>afterLoginRedirect(user, nextPage), 350);
  });

  formSignup.addEventListener('submit', function(e){
    e.preventDefault();
    const name = document.getElementById('signup-name').value.trim();
    const email = document.getElementById('signup-email').value.trim().toLowerCase();
    const phone = document.getElementById('signup-phone').value.trim();
    const pass = document.getElementById('signup-password').value;
    const wantsSeller = sellerCheck.checked;
    const shopName = document.getElementById('signup-shopname').value.trim();
    const errEl = document.getElementById('signup-error');

    const users = getUsers();
    if(users.some(u=>u.email.toLowerCase()===email)){
      errEl.textContent = 'An account with this email already exists. Try logging in instead.';
      errEl.style.display='block';
      return;
    }
    if(pass.length < 4){
      errEl.textContent = 'Please choose a password with at least 4 characters.';
      errEl.style.display='block';
      return;
    }
    if(wantsSeller && !shopName){
      errEl.textContent = 'Please enter your shop or business name to register as a seller.';
      errEl.style.display='block';
      return;
    }
    const newUser = {
      id: 'U' + (Date.now()).toString().slice(-8),
      name, email, phone, password: pass,
      role: wantsSeller ? 'seller' : 'user',
      joined:new Date().toISOString(), addresses:[]
    };
    if(wantsSeller){
      newUser.shopName = shopName;
      newUser.sellerStatus = 'pending';
    }
    users.push(newUser);
    saveUsers(users);
    setSession(newUser.id);
    if(wantsSeller){
      toast('Seller account created — pending admin approval');
      setTimeout(()=>{ location.href='seller/index.html'; }, 400);
    }else{
      toast('Account created — welcome to Bittu Store!');
      setTimeout(()=>afterLoginRedirect(newUser, nextPage), 350);
    }
  });

  /* ---------------- demo Google sign-in ---------------- */
  const googleBtn = document.getElementById('google-signin-btn');
  const googleModal = document.getElementById('google-modal');
  googleBtn.addEventListener('click', ()=>googleModal.classList.add('show'));
  document.getElementById('google-modal-cancel').addEventListener('click', ()=>googleModal.classList.remove('show'));
  googleModal.addEventListener('click', (e)=>{ if(e.target===googleModal) googleModal.classList.remove('show'); });

  document.querySelectorAll('.g-account').forEach(btn=>{
    btn.addEventListener('click', function(){
      const gName = this.dataset.gName;
      const gEmail = this.dataset.gEmail;
      const users = getUsers();
      let user = users.find(u=>u.email.toLowerCase()===gEmail.toLowerCase());
      if(!user){
        user = {
          id:'U'+Date.now().toString().slice(-8),
          name:gName, email:gEmail, password:'', role:'user',
          joined:new Date().toISOString(), addresses:[], authMethod:'google-demo'
        };
        users.push(user);
        saveUsers(users);
      }
      setSession(user.id);
      googleModal.classList.remove('show');
      toast('Signed in as ' + gName.split(' ')[0] + ' (Google demo)');
      setTimeout(()=>afterLoginRedirect(user, nextPage), 350);
    });
  });

  /* ---------------- demo Mobile OTP ---------------- */
  let generatedOtp = null;
  let otpPhone = null;
  const otpError = document.getElementById('otp-error');
  const otpNote = document.getElementById('otp-note');
  const stepPhone = document.getElementById('otp-step-phone');
  const stepVerify = document.getElementById('otp-step-verify');

  function sendOtp(){
    const phoneInput = document.getElementById('otp-phone');
    const phone = phoneInput.value.trim();
    otpError.style.display='none';
    if(!/^[0-9]{10}$/.test(phone)){
      otpError.textContent = 'Please enter a valid 10-digit mobile number.';
      otpError.style.display='block';
      return;
    }
    otpPhone = phone;
    generatedOtp = String(Math.floor(1000 + Math.random()*9000));
    otpNote.textContent = 'Demo OTP for ' + phone + ': ' + generatedOtp + ' (in production this would arrive via SMS)';
    otpNote.style.display='block';
    stepPhone.style.display='none';
    stepVerify.style.display='block';
    document.getElementById('otp-code').value='';
    toast('OTP sent (demo)');
  }

  document.getElementById('send-otp-btn').addEventListener('click', sendOtp);
  document.getElementById('resend-otp-btn').addEventListener('click', ()=>{
    document.getElementById('otp-phone').value = otpPhone || document.getElementById('otp-phone').value;
    sendOtp();
  });

  document.getElementById('verify-otp-btn').addEventListener('click', function(){
    const entered = document.getElementById('otp-code').value.trim();
    otpError.style.display='none';
    if(entered !== generatedOtp){
      otpError.textContent = 'Incorrect OTP. Please check the demo code shown above and try again.';
      otpError.style.display='block';
      return;
    }
    const users = getUsers();
    let user = users.find(u=>u.phone===otpPhone);
    if(!user){
      user = {
        id:'U'+Date.now().toString().slice(-8),
        name:'Bittu Customer', email:otpPhone+'@otp.bittustore.demo', phone:otpPhone, password:'',
        role:'user', joined:new Date().toISOString(), addresses:[], authMethod:'otp-demo'
      };
      users.push(user);
      saveUsers(users);
    }
    setSession(user.id);
    toast('Mobile number verified!');
    setTimeout(()=>afterLoginRedirect(user, nextPage), 350);
  });
}
document.addEventListener('DOMContentLoaded', initAuthPage);
