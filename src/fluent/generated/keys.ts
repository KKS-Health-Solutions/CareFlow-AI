import '@servicenow/sdk/global'

declare global {
    namespace Now {
        namespace Internal {
            interface Keys extends KeysRegistry {
                explicit: {
                    bom_json: {
                        table: 'sys_module'
                        id: 'c1081e4dc1ec4505abd6c77ec54fcb49'
                    }
                    'discharge-command-center': {
                        table: 'sys_ui_page'
                        id: '5487c8d5efe24cc9b6f0b70f30cf8ae7'
                    }
                    'global/____insertStyle': {
                        table: 'sys_ux_lib_asset'
                        id: '843b6ae34c374a76a549e00dd416094c'
                    }
                    'global/____insertStyle.js.map': {
                        table: 'sys_ux_lib_asset'
                        id: '0a4aa5622aea4ed8a4e8618e55ded89c'
                    }
                    'global/case-main': {
                        table: 'sys_ux_lib_asset'
                        id: 'ba072f315130446ea08c1df8e207707c'
                    }
                    'global/case-main.js.map': {
                        table: 'sys_ux_lib_asset'
                        id: 'e22b71697f10402b95dae8ecc4608e4d'
                    }
                    'global/dashboard-main': {
                        table: 'sys_ux_lib_asset'
                        id: '3f884084eeaf40f9b411c944effabd91'
                    }
                    'global/dashboard-main.js.map': {
                        table: 'sys_ux_lib_asset'
                        id: 'f8da9d01257341428c8f38befd689e2a'
                    }
                    package_json: {
                        table: 'sys_module'
                        id: 'b8d181d18bf04364b9654c86707e3661'
                    }
                    'patient-discharge-case': {
                        table: 'sys_ui_page'
                        id: '1b5a01f1935f46589adfbdc7fc24c3b8'
                    }
                }
            }
        }
    }
}
