﻿/// <reference path="../../../Scripts/typings/angularjs/angular.d.ts" />
/// <reference path="../../../Scripts/typings/angularjs/angular-route.d.ts" />


namespace Ally
{
    interface IEmailAbuseRouteParams extends ng.route.IRouteParamsService
    {
        idValue: string;
    }


    /**
     * The controller for a page that lets a user complain about group e-mail utilization
     */
    export class EmailAbuseController implements ng.IController
    {
        static $inject = ["$http","$routeParams"];

        isLoading = false;
        otherReasonText: string;
        showButtons = true;
        boardEmail: string;


        /**
         * The constructor for the class
         */
        constructor( private $http: ng.IHttpService, private $routeParams: IEmailAbuseRouteParams )
        {
        }


        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit()
        {
            this.boardEmail = `board.${HtmlUtil.getSubdomain()}@inmail.${AppConfig.baseTld}`;
        }


        /**
         * Ask that  
         */
        reportAbuse( abuseReason:string )
        {
            if( abuseReason === "not-member" )
            {
                if( !confirm( "You should reach out to the board rather than contact technical support. Click 'OK' to still proceed with contacting technical support anyway." ) )
                    return;
            }

            // It's double encoded to prevent angular trouble, so double decode
            var idVal = decodeURIComponent( this.$routeParams.idValue );

            var postData = {
                abuseReason: abuseReason,
                idVal: idVal,
                otherReasonText: this.otherReasonText
            };

            this.isLoading = true;

            var innerThis = this;
            this.$http.post( "/api/EmailAbuse/v3", postData ).then(() =>
            {
                innerThis.isLoading = false;
                innerThis.showButtons = false;
            });
        }
    }
}

CA.angularApp.component( "emailAbuse", {
    templateUrl: "/ngApp/chtn/public/email-abuse.html",
    controller: Ally.EmailAbuseController
});