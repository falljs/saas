import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { InscriptionService } from 'src/app/services/inscription.service';

@Component({
  selector: 'app-inscription',
  templateUrl: './inscription.component.html',
  styleUrls: ['./inscription.component.scss']
})
export class InscriptionComponent implements OnInit {

  inscriptionForm!: FormGroup;

  referralCode: string = '';

  loading = false;

  success = false;

  errorMessage = '';

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private inscriptionService: InscriptionService
  ) { }

  ngOnInit(): void {

    /*
    |--------------------------------------------------------------------------
    | FORMULAIRE
    |--------------------------------------------------------------------------
    */

    this.inscriptionForm = this.fb.group({

      nom_entreprise: [
        '',
        [
          Validators.required,
          Validators.minLength(2),
          Validators.maxLength(150)
        ]
      ],

      sous_domaine: [
        '',
        [
          Validators.required,
          Validators.minLength(3),
          Validators.maxLength(50),
          Validators.pattern(/^[a-zA-Z0-9-]+$/)
        ]
      ],

      email: [
        '',
        [
          Validators.required,
          Validators.email
        ]
      ],

      password: [
        '',
        [
          Validators.required,
          Validators.minLength(8)
        ]
      ],

      password_confirmation: [
        '',
        [
          Validators.required
        ]
      ],

      referral_code: [
        '',
        [
          Validators.maxLength(20)
        ]
      ]

    });

    /*
    |--------------------------------------------------------------------------
    | RÉCUPÉRATION DU CODE DE PARRAINAGE
    |--------------------------------------------------------------------------
    */

    this.route.queryParamMap.subscribe(params => {

      const ref = params.get('ref');

      if (ref) {

        this.referralCode = ref.trim().toUpperCase();

        this.inscriptionForm.patchValue({
          referral_code: this.referralCode
        });

      }

    });

  }


  /*
  |--------------------------------------------------------------------------
  | GETTERS
  |--------------------------------------------------------------------------
  */

  get f() {
    return this.inscriptionForm.controls;
  }


  /*
  |--------------------------------------------------------------------------
  | SOUS-DOMAINE
  |--------------------------------------------------------------------------
  */

  normalizeSubdomain(): void {

    const value =
      this.inscriptionForm
        .get('sous_domaine')
        ?.value || '';

    const normalized = value
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');

    this.inscriptionForm
      .get('sous_domaine')
      ?.setValue(normalized, {
        emitEvent: false
      });

  }


  /*
  |--------------------------------------------------------------------------
  | VALIDATION MOTS DE PASSE
  |--------------------------------------------------------------------------
  */

  passwordsMatch(): boolean {

    const password =
      this.inscriptionForm.get('password')?.value;

    const confirmation =
      this.inscriptionForm
        .get('password_confirmation')
        ?.value;

    return password === confirmation;

  }


  /*
  |--------------------------------------------------------------------------
  | INSCRIPTION
  |--------------------------------------------------------------------------
  */

  submit(): void {

    this.errorMessage = '';

    this.success = false;

    if (this.inscriptionForm.invalid) {

      this.inscriptionForm.markAllAsTouched();

      return;
    }

    if (!this.passwordsMatch()) {

      this.errorMessage =
        'Les deux mots de passe ne correspondent pas.';

      return;
    }

    this.loading = true;

    const data = {
      nom_entreprise:
        this.inscriptionForm.value.nom_entreprise,

      sous_domaine:
        this.inscriptionForm.value.sous_domaine,

      email:
        this.inscriptionForm.value.email,

      password:
        this.inscriptionForm.value.password,

      password_confirmation:
        this.inscriptionForm.value.password_confirmation,

      referral_code:
        this.inscriptionForm.value.referral_code || null
    };

    this.inscriptionService
      .inscrire(data)
      .subscribe({

        next: (response) => {

          this.loading = false;

          this.success = true;

          /*
          |--------------------------------------------------------------------------
          | REDIRECTION VERS LA CONNEXION
          |--------------------------------------------------------------------------
          */

          setTimeout(() => {

            this.router.navigate(
              ['/login'],
              {
                queryParams: {
                  inscription: 'success',
                  email: data.email
                }
              }
            );

          }, 3000);

        },

        error: (error) => {

          this.loading = false;

          console.error(
            'Erreur inscription',
            error
          );

          if (
            error?.error?.message
          ) {

            this.errorMessage =
              error.error.message;

          } else if (
            error?.error?.errors
          ) {

            const errors =
              error.error.errors;

            const firstError =
              Object.values(errors)[0];

            this.errorMessage =
              Array.isArray(firstError)
                ? firstError[0]
                : 'Une erreur est survenue.';

          } else {

            this.errorMessage =
              'Impossible de créer votre compte. Veuillez réessayer.';

          }

        }

      });

  }


  /*
  |--------------------------------------------------------------------------
  | RETOUR CONNEXION
  |--------------------------------------------------------------------------
  */

  goToLogin(): void {

    this.router.navigate(['/login']);

  }

}