import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { AuthService } from 'src/app/services/Auth/auth.service';
import { User } from 'src/app/models/User';
import { FacebookLoginProvider, GoogleLoginProvider } from "angularx-social-login";
import { SocialAuthService, SocialUser } from "angularx-social-login";
import { environment } from 'src/environments/environment';

declare var google: any;


@Component({
    selector: 'app-login',
    templateUrl: './login.component.html',
    styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {

    public loginForm: FormGroup = new FormGroup({});

    user: SocialUser = new SocialUser;
    loggedIn: boolean = false;
    submitted = false;

    constructor(
        private socialAuthService: SocialAuthService,
        private auth: AuthService,
        private messageService: MessageService, private router: Router) { }

    ngOnSubmit() {

        this.submitted = true;

        let user = new User();
        user.email = this.loginForm.controls.email.value;
        user.contraseña = this.loginForm.controls.contraseña.value;

        this.auth.login(user).subscribe(
            response => {
                localStorage.setItem('auth', JSON.stringify(response));

                this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Sesión iniciada' });

                window.location.href = window.location.href.slice(0, window.location.href.lastIndexOf('/'));
            },
            error => {
                this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Correo o contraseña incorrectos' });
            }
        );

    }

    ngOnInit(): void {
        this.loginForm = new FormGroup({
            email: new FormControl('', [Validators.required]),
            contraseña: new FormControl('', [Validators.required]),
        });

        this.socialAuthService.authState.subscribe((user) => {
            this.user = user;
            this.loggedIn = (user != null);
            let usuario: any = {
                email: user.email,
                tipo: "Postulante",
                foto: user.photoUrl
            }
            this.auth.signInWithSocial(usuario).subscribe(
                response => {
                    console.log(response);
                    localStorage.setItem('auth', JSON.stringify(response));
                    this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Sesión iniciada' });

                    window.location.href = window.location.href.slice(0, window.location.href.lastIndexOf('/'));
                },
                error => {
                    this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Algo salio mal' });
                }
            );
        });
    }


    ngAfterViewInit(): void {
        google.accounts.id.initialize({
            client_id: environment.GoogleLoginProvider,
            callback: (response: any) => this.handleGoogleSignIn(response)
        });
        google.accounts.id.renderButton(
            document.getElementById("buttonDiv"),
            { size: "large", type: "large", shape: "pill", width: '100%' }  // customization attributes
        );
    }

    handleGoogleSignIn(response: any) {
        console.log(response.credential);

        // This next is for decoding the idToken to an object if you want to see the details.
        let base64Url = response.credential.split('.')[1];
        let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        let jsonPayload = decodeURIComponent(atob(base64).split('').map(function (c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        console.log(JSON.parse(jsonPayload));
        const payload = JSON.parse(jsonPayload);
        let usuario: any = {
            email: payload.email,
            tipo: "Postulante",
            foto: payload.picture
        }
        this.auth.signInWithSocial(usuario).subscribe(
            response => {
                console.log(response);
                localStorage.setItem('auth', JSON.stringify(response));
                this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Sesión iniciada' });

                window.location.href = window.location.href.slice(0, window.location.href.lastIndexOf('/'));
            },
            error => {
                this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Algo salio mal' });
            }
        );
    }

    signInWithFB(): void {
        this.socialAuthService.signIn(FacebookLoginProvider.PROVIDER_ID);
    }

    signOut(): void {
        this.socialAuthService.signOut();
    }

}
