﻿namespace Ally
{
    /**
     * The controller for the Home Ally home page
     */
    export class HomeGroupHomeController implements ng.IController
    {
        static $inject = ["$http", "$rootScope", "SiteInfo", "$timeout", "appCacheService"];
        welcomeMessage: string;
        isFirstVisit: boolean;
        isSiteManager: boolean;
        showFirstVisitModal: boolean;
        homeRightColumnType: string;
        allyAppName: string;
        messageObject: any;
        recentPayments: any[];
        numRecentPayments: number;
        paymentInfo: any;
        nextPaymentText: string;
        knowsNextPayment: boolean;
        errorPayInfoText: string;
        isLoading_LocalNews: boolean;
        canSendEmail: boolean;
        isLoadingEmail: boolean;
        localNews: any;
        

        /**
         * The constructor for the class
         */
        constructor( private $http: ng.IHttpService, private $rootScope: ng.IRootScopeService, private siteInfo: Ally.SiteInfoService, private $timeout: ng.ITimeoutService, private appCacheService: AppCacheService )
        {
        }


        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit()
        {
            this.welcomeMessage = this.siteInfo.privateSiteInfo.welcomeMessage;
            this.isFirstVisit = this.siteInfo.userInfo.lastLoginDateUtc === null;
            this.isSiteManager = this.siteInfo.userInfo.isSiteManager;
            this.showFirstVisitModal = this.isFirstVisit && !this.$rootScope.hasClosedFirstVisitModal && this.siteInfo.privateSiteInfo.siteLaunchedDateUtc === null;

            this.homeRightColumnType = this.siteInfo.privateSiteInfo.homeRightColumnType;
            if( !this.homeRightColumnType )
                this.homeRightColumnType = "localnews";

            var subDomain = HtmlUtil.getSubdomain( window.location.host );

            this.allyAppName = AppConfig.appName;


            var MaxNumRecentPayments = 6;
            this.recentPayments = this.siteInfo.userInfo.recentPayments;
            if( this.recentPayments )
            {
                if( this.recentPayments.length > MaxNumRecentPayments )
                    this.recentPayments = this.recentPayments.slice( 0, MaxNumRecentPayments );
                this.numRecentPayments = this.recentPayments.length;

                // Fill up the list so there's always MaxNumRecentPayments
                while( this.recentPayments.length < MaxNumRecentPayments )
                    this.recentPayments.push( {} );
            }

            // The object that contains a message if the user wants to send one out
            this.messageObject = {};


            // If the user lives in a unit and assessments are enabled
            if( this.siteInfo.privateSiteInfo.assessmentFrequency !== null
                && this.siteInfo.userInfo.usersUnits !== null
                && this.siteInfo.userInfo.usersUnits.length > 0 )
            {
                this.paymentInfo.paymentType = "periodic";

                if( this.siteInfo.privateSiteInfo.isPeriodicPaymentTrackingEnabled )
                {
                    this.knowsNextPayment = true;
                    this.errorPayInfoText = "Is the amount or date incorrect?";

                    this.nextPaymentText = this.getNextPaymentText( [this.siteInfo.userInfo.usersUnits[0].nextAssessmentDue],
                        this.siteInfo.privateSiteInfo.assessmentFrequency );

                    this.updatePaymentText();
                }
            }

            this.refreshData();
        }



        // Refresh the not text for the payment field
        updatePaymentText()
        {
            if( this.paymentInfo.paymentType === "periodic" && this.siteInfo.privateSiteInfo.isPeriodicPaymentTrackingEnabled )
            {
                // If we have a next payment string
                if( !HtmlUtil.isNullOrWhitespace( this.nextPaymentText ) )
                {
                    if( this.siteInfo.userInfo.usersUnits[0].includesLateFee )
                        this.paymentInfo.note = "Assessment payment with late fee for ";
                    else
                        this.paymentInfo.note = "Assessment payment for ";

                    this.paymentInfo.note += this.nextPaymentText;
                }
            }
            else
            {
                this.paymentInfo.note = "";
            }
        }


        onSelectPaymentType( paymentType: string )
        {
            this.paymentInfo.paymentType = paymentType;
            this.paymentInfo.amount = paymentType === "periodic" ? this.siteInfo.userInfo.assessmentAmount : 0;

            this.updatePaymentText();
        }



        getNextPaymentText( payPeriods: Ally.PayPeriod[], assessmentFrequency: number )
        {
            if( payPeriods === null )
                return "";

            // Ensure the periods is an array
            if( payPeriods.constructor !== Array )
                payPeriods = [<any>payPeriods];

            var paymentText = "";

            var frequencyInfo = FrequencyIdToInfo( assessmentFrequency );

            for( var periodIndex = 0; periodIndex < payPeriods.length; ++periodIndex )
            {
                var curPeriod = payPeriods[periodIndex];

                if( frequencyInfo.intervalName === "month" )
                {
                    var monthNames = ["January", "February", "March", "April", "May", "June",
                        "July", "August", "September", "October", "November", "December"];

                    paymentText = monthNames[curPeriod.period - 1];
                }
                else if( frequencyInfo.intervalName === "quarter" )
                {
                    var quarterNames = ["Q1", "Q2", "Q3", "Q4"];

                    paymentText = quarterNames[curPeriod.period - 1];
                }
                else if( frequencyInfo.intervalName === "half-year" )
                {
                    var halfYearNames = ["First Half", "Second Half"];

                    paymentText = halfYearNames[curPeriod.period - 1];
                }

                paymentText += " " + curPeriod.year;

                this.paymentInfo.paysFor = [curPeriod];
            }

            return paymentText;
        }


        hideFirstVisit()
        {
            this.$rootScope.hasClosedFirstVisitModal = true;
            this.showFirstVisitModal = false;
        }


        onIncorrectPayDetails()
        {
            // Create a message to the board
            this.messageObject.recipientType = "board";

            if( this.knowsNextPayment )
                this.messageObject.message = "Hello Board Members,\n\nOur association's home page says my next payment of $" + this.siteInfo.userInfo.assessmentAmount + " will cover " + this.nextPaymentText + ", but I believe that is incorrect. My records indicate my next payment of $" + this.siteInfo.userInfo.assessmentAmount + " should pay for [INSERT PROPER DATE HERE]. What do you need from me to resolve the issue?\n\n- " + this.siteInfo.userInfo.firstName;
            else
                this.messageObject.message = "Hello Board Members,\n\nOur association's home page says my assessment payment is $" + this.siteInfo.userInfo.assessmentAmount + ", but I believe that is incorrect. My records indicate my assessment payments should be $[INSERT PROPER AMOUNT HERE]. What do you need from me to resolve the issue?\n\n- " + this.siteInfo.userInfo.firstName;

            document.getElementById( "send-email-panel" ).scrollIntoView();
        }


        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Populate the page from the server
        ///////////////////////////////////////////////////////////////////////////////////////////////
        refreshData()
        {
            //window.location.host is subdomain.domain.com
            var subDomain = HtmlUtil.getSubdomain( window.location.host );

            // A little test to help the automated tests run faster
            var isTestSubdomain = subDomain === "qa" || subDomain === "localtest";
            isTestSubdomain = false;
            if( !isTestSubdomain && this.homeRightColumnType === "localnews" )
            {
                this.isLoading_LocalNews = true;

                var localNewsUri;
                var queryParams;

                if( this.siteInfo.privateSiteInfo.country === "US" )
                {
                    localNewsUri = "https://localnewsally.org/api/LocalNews";

                    queryParams = {
                        clientId: "1001A194-B686-4C45-80BC-ECC0BB4916B4",
                        chicagoWard: this.siteInfo.publicSiteInfo.chicagoWard,
                        zipCode: this.siteInfo.publicSiteInfo.zipCode,
                        cityNeighborhood: this.siteInfo.publicSiteInfo.localNewsNeighborhoodQuery
                    };
                }
                else
                {
                    localNewsUri = "https://localnewsally.org/api/LocalNews/International/MajorCity";

                    queryParams = {
                        clientId: "1001A194-B686-4C45-80BC-ECC0BB4916B4",
                        countryCode: this.siteInfo.privateSiteInfo.country,
                        city: this.siteInfo.privateSiteInfo.groupAddress.city
                    };
                }

                var innerThis = this;

                this.$http.get( localNewsUri, {
                    cache: true,
                    params: queryParams
                } ).then( function( httpResponse: ng.IHttpPromiseCallbackArg<any> )
                {
                    innerThis.localNews = httpResponse.data;
                    innerThis.isLoading_LocalNews = false;
                } );
            }
        }
    }
}


CA.angularApp.component( "homeGroupHome", {
    templateUrl: "/ngApp/home/home-group-home.html",
    controller: Ally.HomeGroupHomeController
} );