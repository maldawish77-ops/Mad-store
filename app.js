
const state = {
  lang: localStorage.getItem('mad_lang') || 'ar',
  cart: JSON.parse(localStorage.getItem('mad_cart') || '[]'),
  category: 'all',
  search: ''
};

const translations = {
  ar: {
    account:'حسابي',announcement:'شحن مجاني للطلبات فوق 299 ر.س داخل المملكة', searchPlaceholder:'ابحث عن منتج...',
    home:'الرئيسية',categories:'الأقسام',products:'المنتجات',offers:'العروض',digital:'الخدمات الرقمية',about:'من نحن',contact:'تواصل معنا',
    heroEyebrow:'تجربة تسوق استثنائية',heroTitle:'كل ما تحتاجه<br>في مكان واحد',heroText:'منتجات مختارة، أسعار منافسة، وتجربة شراء عربية وإنجليزية مصممة للسوق السعودي.',
    shopNow:'تسوق الآن',discover:'اكتشف ماد',securePayment:'دفع آمن',fastDelivery:'توصيل سريع',easyReturn:'إرجاع سهل',
    browse:'تصفح حسب',categoryTitle:'أقسام المتجر',selectedForYou:'مختارة لك',bestProducts:'أفضل المنتجات',
    limitedOffer:'عرض محدود',offerTitle:'خصم يصل إلى 40%',offerText:'على تشكيلة مختارة من الإلكترونيات والعطور والإكسسوارات.',shopOffer:'تسوق العرض',
    digitalEyebrow:'حلول احترافية',digitalTitle:'خدمات ومنتجات رقمية',cvService:'تصميم سيرة ذاتية',cvDesc:'سيرة احترافية عربية أو إنجليزية.',
    slidesService:'عروض تقديمية',slidesDesc:'تصميم أكاديمي وتجاري احترافي.',socialService:'تصاميم السوشيال',socialDesc:'منشورات وإعلانات متوافقة مع الهوية.',
    supportService:'إدارة العملاء',supportDesc:'ردود، متابعة، وتنظيم تجربة العميل.',aboutTitle:'علامة سعودية بطموح كبير',
    aboutText:'ماد متجر إلكتروني متعدد الأقسام، يجمع المنتجات والخدمات الرقمية في تجربة واحدة، مع تصميم فاخر وخدمة موثوقة وسهلة.',
    departments:'أقسام',support:'دعم العملاء',languages:'لغتان',responsive:'متوافق مع الجوال',footerText:'كل ما تحتاجه في مكان واحد.',
    quickLinks:'روابط سريعة',policies:'السياسات',privacy:'الخصوصية',returns:'الإرجاع والاستبدال',terms:'الشروط والأحكام',
    yourCart:'سلة التسوق',total:'الإجمالي',checkout:'إتمام الطلب',emptyCart:'السلة فارغة',checkoutTitle:'إتمام الطلب',
    fullName:'الاسم الكامل',phone:'رقم الجوال',city:'المدينة',address:'العنوان',payment:'طريقة الدفع',placeOrder:'المتابعة للدفع',
    added:'تمت إضافة المنتج إلى السلة',orderDone:'تم تأكيد الدفع والطلب بنجاح',all:'الكل'
  },
  en: {
    account:'Account',announcement:'Free shipping on orders over SAR 299 across Saudi Arabia', searchPlaceholder:'Search products...',
    home:'Home',categories:'Categories',products:'Products',offers:'Offers',digital:'Digital Services',about:'About',contact:'Contact',
    heroEyebrow:'An exceptional shopping experience',heroTitle:'Everything you need<br>in one place',heroText:'Curated products, competitive prices, and a bilingual shopping experience built for Saudi Arabia.',
    shopNow:'Shop now',discover:'Discover MAD',securePayment:'Secure payment',fastDelivery:'Fast delivery',easyReturn:'Easy returns',
    browse:'Browse by',categoryTitle:'Store categories',selectedForYou:'Selected for you',bestProducts:'Featured products',
    limitedOffer:'Limited offer',offerTitle:'Up to 40% off',offerText:'On selected electronics, perfumes, and accessories.',shopOffer:'Shop the offer',
    digitalEyebrow:'Professional solutions',digitalTitle:'Digital services and products',cvService:'CV Design',cvDesc:'Professional Arabic or English CVs.',
    slidesService:'Presentations',slidesDesc:'Professional academic and business decks.',socialService:'Social Designs',socialDesc:'Branded social media posts and ads.',
    supportService:'Customer Management',supportDesc:'Replies, follow-ups, and customer experience organization.',aboutTitle:'A Saudi brand with big ambition',
    aboutText:'MAD is a multi-category e-commerce store combining physical and digital products in one premium, reliable, and easy experience.',
    departments:'Categories',support:'Customer Support',languages:'Languages',responsive:'Mobile Ready',footerText:'Everything you need in one place.',
    quickLinks:'Quick Links',policies:'Policies',privacy:'Privacy',returns:'Returns & Exchanges',terms:'Terms & Conditions',
    yourCart:'Shopping Cart',total:'Total',checkout:'Checkout',emptyCart:'Your cart is empty',checkoutTitle:'Checkout',
    fullName:'Full Name',phone:'Phone Number',city:'City',address:'Address',payment:'Payment Method',placeOrder:'Continue to payment',
    added:'Product added to cart',orderDone:'Payment and order confirmed successfully',all:'All'
  }
};

const categories = [
  {id:'electronics', ar:'الإلكترونيات', en:'Electronics', icon:'📱'},
  {id:'fashion', ar:'الأزياء', en:'Fashion', icon:'👕'},
  {id:'perfumes', ar:'العطور', en:'Perfumes', icon:'🧴'},
  {id:'accessories', ar:'الإكسسوارات', en:'Accessories', icon:'⌚'},
  {id:'home', ar:'المنزل والمطبخ', en:'Home & Kitchen', icon:'🪑'},
  {id:'beauty', ar:'الجمال والعناية', en:'Beauty', icon:'✨'},
  {id:'gifts', ar:'الهدايا', en:'Gifts', icon:'🎁'},
  {id:'digital', ar:'المنتجات الرقمية', en:'Digital Products', icon:'💻'},
  {id:'gaming', ar:'الألعاب', en:'Gaming', icon:'🎮'},
  {id:'services', ar:'الخدمات الرقمية', en:'Digital Services', icon:'▤'}
];

let products = [];

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

function t(key){ return translations[state.lang][key] || key; }
function nameOf(item){ return item[state.lang]; }
function currency(v){ return state.lang === 'ar' ? `${v} ر.س` : `SAR ${v}`; }

function applyLanguage(){
  document.documentElement.lang = state.lang;
  document.documentElement.dir = state.lang === 'ar' ? 'rtl' : 'ltr';
  document.body.classList.toggle('en', state.lang === 'en');
  $('#langBtn').textContent = state.lang === 'ar' ? 'EN' : 'عربي';
  $$('[data-i18n]').forEach(el => el.innerHTML = t(el.dataset.i18n));
  $$('[data-i18n-placeholder]').forEach(el => el.placeholder = t(el.dataset.i18nPlaceholder));
  renderCategories(); renderFilters(); renderProducts(); renderCart();
  localStorage.setItem('mad_lang', state.lang);
}

function renderCategories(){
  $('#categoryGrid').innerHTML = categories.map(c => `
    <article class="category-card" data-category="${c.id}">
      <span class="icon">${c.icon}</span><h3>${nameOf(c)}</h3>
    </article>`).join('');
  $$('.category-card').forEach(card => card.onclick = () => {
    state.category = card.dataset.category; renderFilters(); renderProducts();
    document.querySelector('#products').scrollIntoView();
  });
}

function renderFilters(){
  const filterData = [{id:'all', ar:'الكل', en:'All'}, ...categories.slice(0,6)];
  $('#filters').innerHTML = filterData.map(c =>
    `<button class="filter-btn ${state.category===c.id?'active':''}" data-filter="${c.id}">${nameOf(c)}</button>`
  ).join('');
  $$('.filter-btn').forEach(btn => btn.onclick = () => {
    state.category = btn.dataset.filter; renderFilters(); renderProducts();
  });
}

function renderProducts(){
  const q = state.search.trim().toLowerCase();
  const list = products.filter(p => (state.category==='all'||p.category===state.category) &&
    (!q || p.ar.includes(q) || p.en.toLowerCase().includes(q)));
  $('#productsGrid').innerHTML = list.length ? list.map(p => {
    const discount = p.old ? Math.round((1-p.price/p.old)*100) : 0;
    return `<article class="product-card">
      ${discount?`<span class="discount">-${discount}%</span>`:''}
      <div class="product-image">${p.image?`<img src="${p.image}" alt="${nameOf(p)}">`:p.icon}</div>
      <div class="product-body">
        <span class="product-category">${nameOf(categories.find(c=>c.id===p.category) || {ar:'',en:''})}</span>
        <h3>${nameOf(p)}</h3>
        <div class="rating">★★★★★ <span>${p.rating}</span></div>
        <div class="price-row">
          <div class="price"><strong>${currency(p.price)}</strong>${p.old?`<span class="old-price">${currency(p.old)}</span>`:''}</div>
          <button class="add-btn" data-add="${p.id}">+</button>
        </div>
      </div>
    </article>`;
  }).join('') : `<p>${state.lang==='ar'?'لا توجد منتجات مطابقة.':'No matching products.'}</p>`;
  $$('[data-add]').forEach(btn => btn.onclick = () => addToCart(+btn.dataset.add));
}

function addToCart(id){
  const row = state.cart.find(x=>x.id===id);
  if(row) row.qty++; else state.cart.push({id,qty:1});
  saveCart(); renderCart(); showToast(t('added'));
}

function saveCart(){ localStorage.setItem('mad_cart', JSON.stringify(state.cart)); }

function renderCart(){
  const box = $('#cartItems');
  if(!state.cart.length) box.innerHTML = `<p style="text-align:center;color:#888;margin-top:40px">${t('emptyCart')}</p>`;
  else box.innerHTML = state.cart.map(row => {
    const p = products.find(x=>x.id===row.id);
    return `<div class="cart-item">
      <div class="cart-item-img">${p.icon}</div>
      <div><h4>${nameOf(p)}</h4><div>${currency(p.price)}</div>
        <div class="qty"><button data-dec="${p.id}">−</button><span>${row.qty}</span><button data-inc="${p.id}">+</button></div>
      </div>
      <button class="remove" data-remove="${p.id}">×</button>
    </div>`;
  }).join('');
  const count = state.cart.reduce((s,x)=>s+x.qty,0);
  const total = state.cart.reduce((s,x)=>s+(products.find(p=>p.id===x.id)?.price||0)*x.qty,0);
  $('#cartCount').textContent = count; $('#cartTotal').textContent = currency(total);
  $$('[data-inc]').forEach(b=>b.onclick=()=>changeQty(+b.dataset.inc,1));
  $$('[data-dec]').forEach(b=>b.onclick=()=>changeQty(+b.dataset.dec,-1));
  $$('[data-remove]').forEach(b=>b.onclick=()=>{state.cart=state.cart.filter(x=>x.id!==+b.dataset.remove);saveCart();renderCart()});
}

function changeQty(id,delta){
  const row=state.cart.find(x=>x.id===id); if(!row)return;
  row.qty+=delta; if(row.qty<=0)state.cart=state.cart.filter(x=>x.id!==id);
  saveCart();renderCart();
}

function openCart(){ $('#cartDrawer').classList.add('open'); $('#overlay').classList.add('show'); }
function closeCart(){ $('#cartDrawer').classList.remove('open'); $('#overlay').classList.remove('show'); }
function showToast(msg){ const el=$('#toast');el.textContent=msg;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),2200); }

$('#langBtn').onclick=()=>{state.lang=state.lang==='ar'?'en':'ar';applyLanguage()};
$('#cartBtn').onclick=openCart; $('#closeCart').onclick=closeCart; $('#overlay').onclick=closeCart;
$('#mobileMenuBtn').onclick=()=>$('#mainNav').classList.toggle('open');
$('#searchInput').addEventListener('input',e=>{state.search=e.target.value;renderProducts()});
$('#searchBtn').onclick=()=>document.querySelector('#products').scrollIntoView();

$('#checkoutBtn').onclick=()=>{
  if(!state.cart.length){showToast(t('emptyCart'));return}
  closeCart();$('#checkoutModal').classList.add('show');
};
$('#closeCheckout').onclick=()=>$('#checkoutModal').classList.remove('show');
$('#checkoutForm').onsubmit=async e=>{
  e.preventDefault();
  const form = new FormData(e.target);
  const payload = {
    customer: Object.fromEntries(form.entries()),
    items: state.cart.map(row => ({ productId: row.id, quantity: row.qty })),
    language: state.lang
  };
  const button = e.target.querySelector('button[type=submit]');
  button.disabled = true;
  try {
    const response = await fetch('/api/orders', {
      method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload)
    });
    const result = await response.json();
    if(!response.ok) throw new Error(result.error || 'Order failed');
    if(!window.Moyasar) throw new Error('Payment form failed to load');
    button.hidden = true;
    $('#paymentNote').textContent = state.lang==='ar' ? 'أكمل الدفع الآمن أدناه. لن يتم اعتماد الطلب قبل نجاح الدفع.' : 'Complete secure payment below. The order is not accepted until payment succeeds.';
    $('#moyasarContainer').hidden = false;
    $('.mysr-form').innerHTML = '';
    const callbackBase = `${location.origin}/payment-callback?order_id=${encodeURIComponent(result.order.id)}`;
    Moyasar.init({
      element: '.mysr-form',
      amount: Math.round(Number(result.order.total) * 100),
      currency: 'SAR',
      description: `MAD order ${result.order.id}`,
      publishable_api_key: result.payment.publishableKey,
      callback_url: callbackBase,
      supported_networks: ['visa', 'mastercard', 'mada'],
      methods: ['creditcard']
    });
  } catch(err) {
    console.error(err);
    showToast(state.lang==='ar' ? (err.message.includes('configured') ? 'الدفع الإلكتروني قيد التفعيل' : 'تعذر بدء عملية الدفع') : 'Could not start payment');
    button.disabled = false;
  }
};


async function boot(){
  try {
    const response = await fetch('/api/products');
    products = await response.json();
  } catch(err) {
    showToast(state.lang==='ar' ? 'تعذر تحميل المنتجات' : 'Could not load products');
  }
  applyLanguage();
}
boot();
