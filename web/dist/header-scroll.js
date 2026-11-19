let lastY=0,direction=0,distance=0,scheduled=false;
export function syncHeader(){
 const header=document.querySelector('.header');if(!header)return;
 header.classList.remove('header-reveal','header-away');
 lastY=Math.max(0,scrollY);direction=0;distance=0;
}
function update(){
 scheduled=false;
 const header=document.querySelector('.header'),slot=document.querySelector('.header-slot');
 if(!header||!slot)return;
 const y=Math.max(0,Math.min(scrollY,document.documentElement.scrollHeight-innerHeight));
 const delta=y-lastY;lastY=y;
 if(Math.abs(delta)<1)return;
 const next=Math.sign(delta);if(next!==direction){direction=next;distance=0;}distance+=Math.abs(delta);
 const end=slot.offsetTop+slot.offsetHeight;
 if(y<=slot.offsetTop){header.classList.remove('header-reveal','header-away');return;}
 if(next>0&&distance>10&&(y>end||header.classList.contains('header-reveal'))){header.classList.add('header-away');header.classList.remove('header-reveal');}
 if(next<0&&distance>=18&&y>slot.offsetTop){header.classList.remove('header-away');header.classList.add('header-reveal');}
}
window.addEventListener('scroll',()=>{if(!scheduled){scheduled=true;requestAnimationFrame(update);}},{passive:true});
