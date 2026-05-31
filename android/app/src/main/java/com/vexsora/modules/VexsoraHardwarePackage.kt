package com.vexsora.modules

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class VexsoraHardwarePackage : ReactPackage {
    override fun createNativeModules(ctx: ReactApplicationContext): List<NativeModule> =
        listOf(VexsoraHardwareModule(ctx), SensorModule(ctx))

    override fun createViewManagers(ctx: ReactApplicationContext): List<ViewManager<in Nothing, in Nothing>> =
        emptyList()
}
