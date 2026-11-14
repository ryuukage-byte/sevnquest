package com.sevnquest.notifier

import android.app.Activity
import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.Button
import android.widget.TextView
import android.widget.Toast
import com.sevnquest.notifier.core.Secrets
import com.sevnquest.notifier.core.ServerConfig
import com.sevnquest.notifier.core.SetupError
import com.sevnquest.notifier.core.SetupLink
import com.sevnquest.notifier.core.SetupResult

/**
 * Menangani deep link pemasangan `sevnquest-notifier://setup?url=...&key=...`.
 * Tidak ada yang disimpan sebelum pengguna menekan "Hubungkan" setelah melihat host tujuannya.
 */
class SetupActivity : Activity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_setup)

        val cancel = findViewById<Button>(R.id.setup_cancel)
        val connect = findViewById<Button>(R.id.setup_connect)
        cancel.setOnClickListener { finish() }

        val link = if (intent?.action == Intent.ACTION_VIEW) intent?.dataString else null
        when (val result = SetupLink.parse(link)) {
            is SetupResult.Valid -> showConfirmation(result, connect)
            is SetupResult.Invalid -> showInvalid(result.error, cancel, connect)
        }
    }

    private fun showConfirmation(result: SetupResult.Valid, connect: Button) {
        val app = application as App
        findViewById<TextView>(R.id.setup_host).text = result.host
        findViewById<TextView>(R.id.setup_url).text = result.config.endpoint
        findViewById<TextView>(R.id.setup_key).text = Secrets.mask(result.config.key)

        val current = app.prefs.config()
        if (current != null && current.endpoint != result.config.endpoint) {
            val currentHost = when (val check = SetupLink.validateEndpoint(current.endpoint)) {
                is SetupLink.EndpointCheck.Ok -> check.host
                is SetupLink.EndpointCheck.Bad -> current.endpoint
            }
            val warning = findViewById<TextView>(R.id.setup_warning)
            warning.text = getString(R.string.setup_replace_warning, currentHost)
            warning.visibility = View.VISIBLE
        }

        connect.setOnClickListener {
            connect.isEnabled = false
            save(app, result.config)
            Toast.makeText(this, R.string.setup_done, Toast.LENGTH_LONG).show()
            startActivity(
                Intent(this, MainActivity::class.java)
                    .addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
            )
            finish()
        }
    }

    private fun showInvalid(error: SetupError, cancel: Button, connect: Button) {
        findViewById<TextView>(R.id.setup_title).setText(R.string.setup_invalid_title)
        findViewById<TextView>(R.id.setup_message).setText(messageFor(error))
        findViewById<View>(R.id.setup_details).visibility = View.GONE
        connect.visibility = View.GONE
        cancel.setText(R.string.btn_close)
    }

    companion object {
        fun messageFor(error: SetupError): Int = when (error) {
            SetupError.NOT_A_SETUP_LINK -> R.string.err_not_setup_link
            SetupError.MISSING_URL -> R.string.err_url_missing
            SetupError.MISSING_KEY -> R.string.err_key_missing
            SetupError.URL_NOT_HTTPS -> R.string.err_url_https
            SetupError.URL_INVALID -> R.string.err_url_invalid
            SetupError.KEY_INVALID -> R.string.err_key_invalid
        }

        /** Menyimpan koneksi baru, mengaktifkan penerusan, lalu mencoba mengirim antrean yang tertahan. */
        fun save(app: App, config: ServerConfig) {
            val prefs = app.prefs
            val firstTime = prefs.config() == null
            prefs.saveConfig(config)
            if (firstTime || prefs.activeSince == 0L) prefs.activeSince = System.currentTimeMillis()
            app.executor.execute {
                app.dispatcher.onConfigChanged()
                app.drainAndReschedule()
            }
        }
    }
}
