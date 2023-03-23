import {AuthenticationStrategy} from '@loopback/authentication';
import {AuthenticationBindings} from '@loopback/authentication/dist/keys';
import {AuthenticationMetadata} from '@loopback/authentication/dist/types';
import {inject, service} from '@loopback/core';
import {repository} from '@loopback/repository';
import {HttpErrors, Request} from '@loopback/rest';
import {UserProfile} from '@loopback/security';
import parseBearerToken from 'parse-bearer-token';
import {RolMenuRepository} from '../repositories';
import {SeguridadUsuarioService} from '../services';

export class AuthStrategy implements AuthenticationStrategy {
  name: string = 'auth';

  constructor(
    @service(SeguridadUsuarioService)
    private servicioSeguridad: SeguridadUsuarioService,
    @inject(AuthenticationBindings.METADATA)
    private metadata: AuthenticationMetadata[],
    @repository(RolMenuRepository)
    private repositorioRolMenu: RolMenuRepository
  ) { }


  /**
   * Autenticacion de un usuario frente a una accion de la base de datos
   * @param request la solicitud con el token
   * @returns el perfil de usuario, underfined cuando no tiene permiso o un httpError
   */
  async authenticate(request: Request): Promise<UserProfile | undefined> {
    let token = parseBearerToken(request);
    if (token) {
      let idRol = this.servicioSeguridad.obtenerRolDesdeToken(token);
      let idMenu: string = this.metadata[0].options![0];
      let accion: string = this.metadata[0].options![1];
      console.log(this.metadata);

      let permiso = await this.repositorioRolMenu.findOne({
        where: {
          rolId: idRol,
          menuId: idMenu
        }
      });
      console.log(permiso)
      let continuar: boolean = false;
      if (permiso) {
        switch (accion) {
          case "guardar":
            continuar = permiso.guardar;
            break;
          case "editar":
            continuar = permiso.editar;
            break;
          case "listar":
            continuar = permiso.listar;
            break;
          case "eliminar":
            continuar = permiso.eliminar;
            break;
          case "descargar":
            continuar = permiso.descargar;
            break;
          default:
            throw new HttpErrors[401]("No es posible ejecutar la accion porque no existe");
        }
        if (continuar) {
          let perfil: UserProfile = Object.assign({
            permitido: "Ok"
          });
          return perfil;
        } else {
          return undefined;
        }

      } else {
        throw new HttpErrors[401]("No es posible ejecutar la accion por falta de permisos");
      }
    }
    throw new HttpErrors[401]("No es posible ejecutar la accion por falta de un token");
  }
}
