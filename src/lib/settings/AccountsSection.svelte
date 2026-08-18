<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<script lang="ts">
	/**
	 * The empty state the Pull requests screen points at.
	 *
	 * There is nothing to connect to yet, and this says exactly that rather than
	 * offering a button that would fail. GitLumiere links no HTTP client in either
	 * language — there is a test asserting it — so an account cannot be
	 * connected by this build at all, and nothing here writes to the OS keychain.
	 */
</script>

<section class="section" id="accounts">
	<header>
		<h2 class="heading">Accounts</h2>
		<span class="note">No account is connected.</span>
	</header>

	<p class="note">
		GitLumiere reads pull requests from whichever service hosts a repository. Connecting one
		takes the host, an ssh key and a token, kept in the OS keychain.
	</p>

	<!--
		The privacy promise stays. It is not the application narrating its own
		limitations — it is a commitment about what GitLumiere does with the
		user's repositories, which is exactly the sort of thing a person cannot
		see for themselves and would want to know before connecting an account.
	-->
	<p class="note">
		Nothing here leaves this machine except through a service you connect yourself.
	</p>
</section>

<style>
	.section {
		display: flex;
		flex-direction: column;
		gap: 8px;
		max-width: 640px;
	}

	.heading {
		margin: 0;
		font-size: var(--fs-ui);
		font-weight: inherit;
	}

	p {
		margin: 0;
	}
</style>
