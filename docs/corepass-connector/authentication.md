---
title: Authentication
sidebar_position: 2
---

## Implementing CorePass Login in your application

- create a login page using html and css based on the design that you like to show users when they want to login. users will use a simple QR code scan on their phone to login using PC and a simple button to be clicked on their phone to login using mobile. NO NEED FOR ANY PASSWORDS OR EMAILS OR PHONE NUMBERS. in the place where you want the qr code to be shown, use this code:

```html
<img alt="{{.link}}" src=" data:image/png;charset=utf-8;base64,{{.qrcode}}" />
```

with any css you want to make it look good.
for the button to be shown on mobile, use this code:

```html
<button>
  <a class="link" href="{{.link}}"> Login with CorePass </a>
</button>
```

Again with any css you want to make it look good.

- if you want to have a sign up page (just to show users more info when they login, because sign up and login using CorePass is the same), you can use the steps above, just create a new html and css for your sign up page, and use `handleClick` in your button click to redirect users to sign up page and vice versa.

**Important note:**

you need to have `<script src="static/js/login.js"></script>` in your html file (in both login.html and register.html) (! it is important that the name of html files for login and sign up are login.html and register.html) to be able to use the login functionality.

1. Set environment variables (this will be done by devops team)
2. Use [app-auth library](https://github.com/CorePass/) to implement the login functionality in your application. you can use the example in the library to see how to use it.
3. After user is redirected to your application, user will scan the qr code or clicks on the button and will be redirected back to your application with a code in the url. you need to use [app-auth library](https://github.com/CorePass/) again to get jwt token from that code. this jwt contains the coreid of the user which is user's blockchain address in Core ecosystem. you can use this address (coreid) to identify the user in your application.

## Authentication (Login) usage

For users to be able to use CorePass for their login, they need to have a CorePass account. If they don't have one, they need to install [CorePass](https://corepass.net/) Application and create an account in it.
After they have an account, they can use CorePass to login to your application. To do so, they need to follow these steps:

1. click on the login button in your application.
2. scan a qr code or click on a button after getting redirected to CorePass Login (Authentication) page (which you can design in css and html based on your needs as explained above).
3. after getting redirected back to your application, you need to use [app-auth library](https://github.com/CorePass/) to get the jwt token from the code in the url.
4. DONE! you have the user's coreid (blockchain address) which you can use to identify the user in your application.
