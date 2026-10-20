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
import com.pause.app.presentation.drawer.DrawerDetailScreen
import com.pause.app.presentation.drawer.DrawerDetailViewModel
import com.pause.app.presentation.drawer.DrawerListScreen
import com.pause.app.presentation.drawer.DrawerListViewModel
import com.pause.app.presentation.home.ExploreScreen
import com.pause.app.presentation.home.HomeScreen
import com.pause.app.presentation.profile.ProfileScreen
import com.pause.app.presentation.profile.ProfileViewModel
import com.pause.app.presentation.share.ShareDrawerScreen
import com.pause.app.presentation.share.ShareDrawerViewModel
import com.pause.app.presentation.splash.SplashScreen
import com.pause.app.presentation.splash.SplashViewModel
import kotlinx.coroutines.delay
import org.koin.androidx.compose.koinViewModel
import org.koin.core.parameter.parametersOf

/** Navigation graph: auth flow + FR-02 drawer flow. */
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

    fun drawerDetail(drawerId: String) = "drawer/$drawerId"
    fun shareDrawer(drawerId: String) = "drawer/$drawerId/share"
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

    var toast by remember { mutableStateOf<UiText?>(null) }

    LaunchedEffect(deepLinkUri) {
        if (!deepLinkUri.isNullOrBlank()) {
            authViewModel.handleDeepLink(deepLinkUri)
            onDeepLinkConsumed()
        }
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
            PauseTab.EXPLORE -> Routes.EXPLORE
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
                    recentDrawers = drawerState.recent,
                    hasError = drawerState.error != null,
                    onCreateDrawer = drawerListViewModel::openCreateSheet,
                    onOpenDrawer = { drawer ->
                        navController.navigate(Routes.drawerDetail(drawer.id))
                    },
                    onNavigate = ::onTabSelected,
                )
            }

            composable(Routes.MEMORIES) {
                LaunchedEffect(Unit) { drawerListViewModel.loadIfNeeded() }
                DrawerListScreen(
                    state = drawerState,
                    onDrawerClick = { drawer -> navController.navigate(Routes.drawerDetail(drawer.id)) },
                    onCreateClick = drawerListViewModel::openCreateSheet,
                    onDismissCreate = drawerListViewModel::closeCreateSheet,
                    onNameChange = drawerListViewModel::onNameChange,
                    onDescriptionChange = drawerListViewModel::onDescriptionChange,
                    onCreateSubmit = drawerListViewModel::createDrawer,
                    onDismissQuota = drawerListViewModel::dismissQuotaDialog,
                    onRetry = drawerListViewModel::load,
                    onNavigate = ::onTabSelected,
                    onConsumeToast = drawerListViewModel::consumeToast,
                    onRespondInvitation = drawerListViewModel::respondInvitation,
                )
            }

            composable(Routes.EXPLORE) {
                ExploreScreen(onNavigate = ::onTabSelected)
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
                    onConsumeMessage = profileViewModel::consumeMessage,
                    onOpenHome = { navController.navigate(Routes.HOME) },
                )
            }
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
