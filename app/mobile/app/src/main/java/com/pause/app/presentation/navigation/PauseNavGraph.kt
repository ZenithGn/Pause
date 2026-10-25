package com.pause.app.presentation.navigation

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.pause.app.presentation.auth.AuthEvent
import com.pause.app.presentation.auth.AuthViewModel
import com.pause.app.presentation.auth.ForgotPasswordScreen
import com.pause.app.presentation.auth.LoginScreen
import com.pause.app.presentation.auth.RegisterScreen
import com.pause.app.presentation.auth.ResetPasswordScreen
import com.pause.app.presentation.common.UiText
import com.pause.app.presentation.common.components.PauseTab
import com.pause.app.presentation.common.components.PauseToast
import com.pause.app.presentation.drawer.CreateDrawerSheet
import com.pause.app.presentation.drawer.DrawerDetailScreen
import com.pause.app.presentation.drawer.DrawerDetailViewModel
import com.pause.app.presentation.drawer.DrawerListScreen
import com.pause.app.presentation.drawer.DrawerListViewModel
import com.pause.app.presentation.home.HomeScreen
import com.pause.app.presentation.profile.ProfileScreen
import com.pause.app.presentation.profile.ProfileViewModel
import com.pause.app.presentation.order.OrderConfirmScreen
import com.pause.app.presentation.order.OrderDetailScreen
import com.pause.app.presentation.order.OrderFormScreen
import com.pause.app.presentation.order.OrderListScreen
import com.pause.app.presentation.order.OrderViewModel
import com.pause.app.presentation.photobooth.PhotoboothPreviewScreen
import com.pause.app.presentation.photobooth.PhotoboothViewModel
import com.pause.app.presentation.photobooth.SelectPhotosScreen
import com.pause.app.presentation.photobooth.TemplateListScreen
import com.pause.app.presentation.share.ShareDrawerScreen
import com.pause.app.presentation.share.ShareDrawerViewModel
import com.pause.app.presentation.splash.SplashScreen
import com.pause.app.presentation.splash.SplashViewModel
import kotlinx.coroutines.delay
import org.koin.androidx.compose.koinViewModel
import org.koin.core.parameter.parametersOf

/** Navigation graph: auth flow + FR-02 drawer flow + FR-03 photobooth & order flow. */
object Routes {
    const val SPLASH = "splash"
    const val LOGIN = "login"
    const val REGISTER = "register"
    const val FORGOT_PASSWORD = "forgot_password"
    const val RESET_PASSWORD = "reset_password"
    const val HOME = "home"
    const val MEMORIES = "memories"
    const val EXPLORE = "explore"
    const val DRAWER_DETAIL = "drawer/{drawerId}"
    const val SHARE_DRAWER = "drawer/{drawerId}/share"
    const val PROFILE = "profile"
    const val PHOTOBOOTH_TEMPLATES = "photobooth/templates"
    const val PHOTOBOOTH_PHOTOS = "photobooth/photos"
    const val PHOTOBOOTH_PREVIEW = "photobooth/preview"
    const val ORDER_FORM = "order/form/{itemId}"
    const val ORDER_CONFIRM = "order/confirm/{orderId}"
    const val ORDER_LIST = "order/list"
    const val ORDER_DETAIL = "order/detail/{orderId}"

    fun drawerDetail(drawerId: String) = "drawer/$drawerId"
    fun shareDrawer(drawerId: String) = "drawer/$drawerId/share"
    fun orderForm(itemId: String) = "order/form/$itemId"
    fun orderConfirm(orderId: String) = "order/confirm/$orderId"
    fun orderDetail(orderId: String) = "order/detail/$orderId"
}

@Composable
fun PauseNavGraph(
    authViewModel: AuthViewModel,
    profileViewModel: ProfileViewModel,
    splashViewModel: SplashViewModel,
    deepLinkUri: String?,
    onDeepLinkConsumed: () -> Unit,
) {
    val navController = rememberNavController()
    val authState by authViewModel.state.collectAsStateWithLifecycle()
    val profileState by profileViewModel.state.collectAsStateWithLifecycle()
    val signedIn by splashViewModel.isSignedIn.collectAsStateWithLifecycle()

    val drawerListViewModel: DrawerListViewModel = koinViewModel()
    val drawerState by drawerListViewModel.state.collectAsStateWithLifecycle()
    val photoboothViewModel: PhotoboothViewModel = koinViewModel()
    val photoboothState by photoboothViewModel.state.collectAsStateWithLifecycle()
    val orderViewModel: OrderViewModel = koinViewModel()
    val orderFormState by orderViewModel.formState.collectAsStateWithLifecycle()
    val orderListState by orderViewModel.listState.collectAsStateWithLifecycle()
    val orderDetailState by orderViewModel.detailState.collectAsStateWithLifecycle()

    var toast by remember { mutableStateOf<UiText?> (null) }

    LaunchedEffect(deepLinkUri) {
        if (!deepLinkUri.isNullOrBlank()) {
            authViewModel.handleDeepLink(deepLinkUri)
            onDeepLinkConsumed()
        }
    }

    // DrawerListViewModel lives at this graph's scope and therefore outlives
    // navigation back to Login. Keep its state tied to the active account.
    LaunchedEffect(authState.session?.user?.id) {
        drawerListViewModel.onSessionChanged(authState.session?.user?.id)
    }

    LaunchedEffect(Unit) {
        authViewModel.events.collect { event ->
            when (event) {
                AuthEvent.NavigateToHome -> navController.navigateClearingBackStack(Routes.HOME)
                AuthEvent.NavigateToLogin, AuthEvent.SignedOut ->
                    navController.navigateClearingBackStack(Routes.LOGIN)
                AuthEvent.OpenResetPassword -> navController.navigate(Routes.RESET_PASSWORD) {
                    launchSingleTop = true
                }
                is AuthEvent.ShowMessage -> toast = event.message
            }
        }
    }

    LaunchedEffect(toast) {
        if (toast != null) {
            delay(3_000)
            toast = null
        }
    }

    fun onTabSelected(tab: PauseTab) {
        val route = when (tab) {
            PauseTab.HOME -> Routes.HOME
            PauseTab.PHOTOBOOTH -> Routes.PHOTOBOOTH_TEMPLATES
            PauseTab.MEMORIES -> Routes.MEMORIES
            PauseTab.PROFILE -> Routes.PROFILE
        }
        if (navController.currentDestination?.route != route) {
            navController.navigate(route) {
                popUpTo(Routes.HOME) { inclusive = false }
                launchSingleTop = true
            }
        }
    }

    Box(modifier = Modifier.fillMaxSize()) {
        NavHost(navController = navController, startDestination = Routes.SPLASH) {
            composable(Routes.SPLASH) {
                SplashScreen()
                LaunchedEffect(signedIn) {
                    when (signedIn) {
                        true -> navController.navigateClearingBackStack(Routes.HOME)
                        false -> navController.navigateClearingBackStack(Routes.LOGIN)
                        null -> Unit
                    }
                }
            }

            composable(Routes.LOGIN) {
                LaunchedEffect(Unit) { authViewModel.resetTransientState() }
                LoginScreen(
                    state = authState,
                    onEmailChange = authViewModel::onEmailChange,
                    onPasswordChange = authViewModel::onPasswordChange,
                    onSignIn = authViewModel::signIn,
                    onForgotPassword = { navController.navigate(Routes.FORGOT_PASSWORD) },
                    onRegister = { navController.navigate(Routes.REGISTER) },
                    onGoogleIdToken = authViewModel::signInWithGoogle,
                    onGoogleCancelled = authViewModel::onGoogleSignInCancelled,
                    onGoogleFailure = authViewModel::onGoogleSignInFailed,
                )
            }

            composable(Routes.REGISTER) {
                RegisterScreen(
                    state = authState,
                    onBack = { navController.popBackStack() },
                    onNameChange = authViewModel::onDisplayNameChange,
                    onEmailChange = authViewModel::onEmailChange,
                    onPasswordChange = authViewModel::onPasswordChange,
                    onConfirmPasswordChange = authViewModel::onConfirmPasswordChange,
                    onTermsChange = authViewModel::onTermsChange,
                    onSignUp = authViewModel::signUp,
                    onResendConfirmation = authViewModel::resendConfirmationEmail,
                    onLoginClick = { navController.navigateClearingBackStack(Routes.LOGIN) },
                )
            }

            composable(Routes.FORGOT_PASSWORD) {
                ForgotPasswordScreen(
                    state = authState,
                    onBack = { navController.popBackStack() },
                    onEmailChange = authViewModel::onEmailChange,
                    onSendResetEmail = authViewModel::sendResetEmail,
                    onBackToLogin = { navController.navigateClearingBackStack(Routes.LOGIN) },
                )
            }

            composable(Routes.RESET_PASSWORD) {
                ResetPasswordScreen(
                    state = authState,
                    onBack = { navController.popBackStack() },
                    onPasswordChange = authViewModel::onPasswordChange,
                    onConfirmPasswordChange = authViewModel::onConfirmPasswordChange,
                    onSubmit = authViewModel::updatePassword,
                )
            }

            composable(Routes.HOME) {
                LaunchedEffect(Unit) { drawerListViewModel.loadIfNeeded() }
                HomeScreen(
                    displayName = profileState.profile?.displayName
                        ?: authState.session?.user?.email?.substringBefore('@'),
                    isPremium = profileState.profile?.isPremium ?: false,
                    maxDrawers = profileState.profile?.maxDrawers ?: 3,
                    ownedDrawerCount = drawerState.owned.size,
                    recentDrawers = drawerState.recent,
                    hasError = drawerState.error != null,
                    pendingInvitationCount = drawerState.pendingInvitationCount,
                    onOpenInvitations = { onTabSelected(PauseTab.MEMORIES) },
                    onCreateDrawer = drawerListViewModel::openCreateSheet,
                    onOpenDrawer = { drawer ->
                        navController.navigate(Routes.drawerDetail(drawer.id))
                    },
                    onStartPhotobooth = {
                        photoboothViewModel.start()
                        navController.navigate(Routes.PHOTOBOOTH_TEMPLATES)
                    },
                    onViewOrders = { navController.navigate(Routes.ORDER_LIST) },
                    onNavigate = ::onTabSelected,
                )
            }

            composable(Routes.PHOTOBOOTH_TEMPLATES) {
                LaunchedEffect(photoboothState.templates.isEmpty()) {
                    if (photoboothState.templates.isEmpty()) photoboothViewModel.loadTemplates()
                }
                TemplateListScreen(
                    state = photoboothState,
                    onBack = { navController.popBackStack() },
                    onTemplateSelected = { templateId ->
                        photoboothViewModel.selectTemplate(templateId)
                        navController.navigate(Routes.PHOTOBOOTH_PHOTOS)
                    },
                )
            }

            composable(Routes.PHOTOBOOTH_PHOTOS) {
                SelectPhotosScreen(
                    state = photoboothState,
                    onBack = { navController.popBackStack() },
                    onDrawerSelected = photoboothViewModel::selectDrawer,
                    onPhotoToggled = photoboothViewModel::togglePhoto,
                    onContinue = { navController.navigate(Routes.PHOTOBOOTH_PREVIEW) },
                )
            }

            composable(Routes.PHOTOBOOTH_PREVIEW) {
                PhotoboothPreviewScreen(
                    state = photoboothState,
                    onBack = { navController.popBackStack() },
                    onEditPhotos = { navController.popBackStack() },
                    onSave = photoboothViewModel::saveDraft,
                    onOrderClick = { draftId ->
                        navController.navigate(Routes.orderForm(draftId))
                    },
                )
            }

            composable(Routes.MEMORIES) {
                LaunchedEffect(Unit) { drawerListViewModel.loadIfNeeded() }
                DrawerListScreen(
                    state = drawerState,
                    maxDrawers = profileState.profile?.maxDrawers ?: 3,
                    onDrawerClick = { drawer -> navController.navigate(Routes.drawerDetail(drawer.id)) },
                    onCreateClick = drawerListViewModel::openCreateSheet,
                    onDismissQuota = drawerListViewModel::dismissQuotaDialog,
                    onRetry = drawerListViewModel::load,
                    onNavigate = ::onTabSelected,
                    onConsumeToast = drawerListViewModel::consumeToast,
                    onRespondInvitation = drawerListViewModel::respondInvitation,
                )
            }

            composable(
                route = Routes.DRAWER_DETAIL,
                arguments = listOf(navArgument("drawerId") { type = NavType.StringType }),
            ) { entry ->
                val drawerId = entry.arguments?.getString("drawerId").orEmpty()
                val detailViewModel: DrawerDetailViewModel = koinViewModel { parametersOf(drawerId) }
                val detailState by detailViewModel.state.collectAsStateWithLifecycle()

                LaunchedEffect(drawerId) { detailViewModel.load() }

                DrawerDetailScreen(
                    state = detailState,
                    onBack = { navController.popBackStack() },
                    onShare = { navController.navigate(Routes.shareDrawer(drawerId)) },
                    onStartPhotobooth = {
                        photoboothViewModel.start(drawerId)
                        navController.navigate(Routes.PHOTOBOOTH_TEMPLATES)
                    },
                    onPhotosPicked = detailViewModel::upload,
                    onToggleSelection = detailViewModel::toggleSelection,
                    onExitSelection = detailViewModel::exitSelectionMode,
                    onDeleteSelected = detailViewModel::deleteSelected,
                    onUpdateDrawer = detailViewModel::updateDrawer,
                    onDeleteDrawer = detailViewModel::deleteDrawer,
                    onLoadMore = detailViewModel::loadMore,
                    onConsumeToast = detailViewModel::consumeToast,
                    onDeleted = {
                        drawerListViewModel.onDrawerDeleted(drawerId)
                        navController.popBackStack()
                    },
                )
            }

            composable(
                route = Routes.SHARE_DRAWER,
                arguments = listOf(navArgument("drawerId") { type = NavType.StringType }),
            ) { entry ->
                val drawerId = entry.arguments?.getString("drawerId").orEmpty()
                val shareViewModel: ShareDrawerViewModel = koinViewModel { parametersOf(drawerId) }
                val shareState by shareViewModel.state.collectAsStateWithLifecycle()

                LaunchedEffect(drawerId) { shareViewModel.load() }

                ShareDrawerScreen(
                    state = shareState,
                    onBack = { navController.popBackStack() },
                    onEmailChange = shareViewModel::onEmailChange,
                    onPermissionChange = shareViewModel::onPermissionChange,
                    onSubmit = shareViewModel::submit,
                    onRevoke = shareViewModel::revoke,
                    onConsumeToast = shareViewModel::consumeToast,
                )
            }

            composable(Routes.PROFILE) {
                LaunchedEffect(Unit) { profileViewModel.load() }
                ProfileScreen(
                    state = profileState,
                    onBack = { navController.popBackStack() },
                    onEdit = profileViewModel::startEditing,
                    onCancelEdit = profileViewModel::cancelEditing,
                    onNameChange = profileViewModel::onNameChange,
                    onPhoneChange = profileViewModel::onPhoneChange,
                    onSave = profileViewModel::save,
                    onAvatarPicked = profileViewModel::onAvatarPicked,
                    onSignOut = {
                        profileViewModel.signOut()
                        navController.navigateClearingBackStack(Routes.LOGIN)
                    },
                    onViewOrders = { navController.navigate(Routes.ORDER_LIST) },
                    onConsumeMessage = profileViewModel::consumeMessage,
                    onNavigate = ::onTabSelected,
                )
            }

            composable(
                route = Routes.ORDER_FORM,
                arguments = listOf(navArgument("itemId") { type = NavType.StringType }),
            ) { entry ->
                val itemId = entry.arguments?.getString("itemId").orEmpty()
                LaunchedEffect(itemId) {
                    orderViewModel.initOrderForm(
                        itemId = itemId,
                        templateName = photoboothState.selectedTemplate?.name ?: "Photobooth Strip",
                        previewUrl = null,
                        slotCount = photoboothState.selectedTemplate?.slotCount ?: 4,
                    )
                }
                OrderFormScreen(
                    state = orderFormState,
                    onBack = { navController.popBackStack() },
                    onNameChange = orderViewModel::onShippingNameChanged,
                    onPhoneChange = orderViewModel::onShippingPhoneChanged,
                    onAddressChange = orderViewModel::onShippingAddressChanged,
                    onNoteChange = orderViewModel::onNoteChanged,
                    onIncrementQuantity = orderViewModel::incrementQuantity,
                    onDecrementQuantity = orderViewModel::decrementQuantity,
                    onSubmit = {
                        orderViewModel.submitOrder { orderId ->
                            navController.navigate(Routes.orderConfirm(orderId)) {
                                popUpTo(Routes.PHOTOBOOTH_PREVIEW) { inclusive = true }
                            }
                        }
                    },
                )
            }

            composable(
                route = Routes.ORDER_CONFIRM,
                arguments = listOf(navArgument("orderId") { type = NavType.StringType }),
            ) { entry ->
                val orderId = entry.arguments?.getString("orderId").orEmpty()
                OrderConfirmScreen(
                    orderId = orderId,
                    onViewDetail = { id ->
                        navController.navigate(Routes.orderDetail(id)) {
                            popUpTo(Routes.HOME)
                        }
                    },
                    onBackHome = { navController.navigateClearingBackStack(Routes.HOME) },
                )
            }

            composable(Routes.ORDER_LIST) {
                OrderListScreen(
                    state = orderListState,
                    onBack = { navController.popBackStack() },
                    onFilterSelected = orderViewModel::setFilter,
                    onOrderClick = { orderId -> navController.navigate(Routes.orderDetail(orderId)) },
                    onRefresh = orderViewModel::loadOrders,
                )
            }

            composable(
                route = Routes.ORDER_DETAIL,
                arguments = listOf(navArgument("orderId") { type = NavType.StringType }),
            ) { entry ->
                val orderId = entry.arguments?.getString("orderId").orEmpty()
                OrderDetailScreen(
                    orderId = orderId,
                    state = orderDetailState,
                    onBack = { navController.popBackStack() },
                    onRefresh = orderViewModel::loadOrderDetail,
                )
            }
        }

        if (drawerState.isCreateSheetOpen) {
            CreateDrawerSheet(
                state = drawerState,
                onDismiss = drawerListViewModel::closeCreateSheet,
                onNameChange = drawerListViewModel::onNameChange,
                onDescriptionChange = drawerListViewModel::onDescriptionChange,
                onSubmit = drawerListViewModel::createDrawer,
            )
        }

        AnimatedVisibility(
            visible = toast != null,
            enter = fadeIn(),
            exit = fadeOut(),
        ) {
            PauseToast(message = toast?.asString().orEmpty())
        }
    }
}

private fun NavHostController.navigateClearingBackStack(route: String) {
    navigate(route) {
        popUpTo(graph.id) { inclusive = true }
        launchSingleTop = true
    }
}
