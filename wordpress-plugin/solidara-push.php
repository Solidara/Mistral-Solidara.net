<?php
/**
 * Plugin Name: Solidara Backend Push
 * Description: Pusht veröffentlichte Beiträge als Gutenberg-Rohinhalt an die Solidara-API (POST /api/posts). Original ist unverändert; Änderungen werden erneut gepusht.
 * Version: 0.1.0
 * Author: Solidara
 * License: GPL-2.0-or-later
 */

if (!defined('ABSPATH')) {
    exit;
}

add_action('save_post_post', 'solidara_push_post', 10, 2);

function solidara_push_settings()
{
    return [
        'endpoint' => defined('SOLIDARA_PUSH_ENDPOINT') ? SOLIDARA_PUSH_ENDPOINT : 'https://api.kontaktoo.com/api/posts',
        'api_key' => defined('SOLIDARA_PUSH_API_KEY') ? SOLIDARA_PUSH_API_KEY : (getenv('SOLIDARA_PUSH_API_KEY') ?: ''),
        'original_lang' => 'de',
    ];
}

function solidara_push_post($post_id, $post)
{
    if (wp_is_post_revision($post_id) || wp_is_post_autosave($post_id)) {
        return;
    }
    if (!$post || $post->post_type !== 'post' || $post->post_status !== 'publish') {
        return;
    }
    solidara_push_send($post);
}

function solidara_push_send(WP_Post $post)
{
    $settings = solidara_push_settings();
    $payload = [
        'source' => 'wordpress',
        'sourceRef' => ['wpPostId' => (int) $post->ID],
        'slug' => $post->post_name ?: sanitize_title($post->post_title),
        'originalLang' => $settings['original_lang'],
        'author' => get_the_author_meta('display_name', (int) $post->post_author) ?: null,
        'status' => 'published',
        'rawContent' => $post->post_content,
    ];

    $response = wp_remote_post($settings['endpoint'], [
        'timeout' => 15,
        'headers' => [
            'Content-Type' => 'application/json',
            'Authorization' => 'Bearer ' . $settings['api_key'],
        ],
        'body' => wp_json_encode($payload),
    ]);

    if (is_wp_error($response)) {
        error_log('solidara-push: request failed: ' . $response->get_error_message());
        return false;
    }

    $code = wp_remote_retrieve_response_code($response);
    if ($code >= 300) {
        error_log('solidara-push: API responded ' . $code . ': ' . wp_remote_retrieve_body($response));
        return false;
    }
    return true;
}
