import { DLEndOfRound } from './dialog/endofround.js';
export default class extends CombatTracker {
  constructor(options) {
    super(options);
  }

  async getData(options) {
    return await super.getData();
  }

  /** @override */
  activateListeners(html) {
    let init;
    let hasEndOfRoundEffects = false;
    html.find('.combatant').each((i, el) => {
      const currentCombat = this.getCurrentCombat();

      const combId = el.getAttribute('data-combatant-id');
      const combatant = currentCombat.combatants.find((c) => c.id == combId);

      init = combatant.actor?.data?.data?.fastturn
        ? game.i18n.localize('DL.TurnFast')
        : game.i18n.localize('DL.TurnSlow');
      el.getElementsByClassName('token-initiative')[0].innerHTML =
        '<a class="combatant-control dlturnorder" title="' +
        game.i18n.localize('DL.TurnChangeTurn') +
        '">' +
        init +
        '</a>';

      // Tooltip on Status Effects
      const effects = el.getElementsByClassName('token-effects')[0].children;
      for (var i = 0; i < effects.length; i++) {
        const effect = effects[i].src.substring(effects[i].src.lastIndexOf('/') + 1);

        const found = Object.keys(CONFIG.DL.statusIcons).find((key) => CONFIG.DL.statusIcons[key].indexOf(effect) > 0);

        if (found && found.length > 0) {
          const tooltip =
            '<div class="tooltipEffect">' +
            effects[i].outerHTML +
            '<span class="tooltiptextEffect">' +
            game.i18n.localize('DL.' + found) +
            ': ' +
            game.i18n.localize('DL.Afflictions' + found.charAt(0).toUpperCase() + found.slice(1)) +
            '</span>';

          effects[i].outerHTML = tooltip;
        }
      }

      const endofrounds =
        combatant.actor != null
          ? combatant?.actor.getEmbeddedCollection('Item').filter((e) => e.type === 'endoftheround')
          : '';
      if (endofrounds.length > 0) hasEndOfRoundEffects = true;
    });

    super.activateListeners(html);

    html.find('.dlturnorder').click((ev) => {
      const li = ev.currentTarget.closest('li');
      const combId = li.dataset.combatantId;
      const currentCombat = this.getCurrentCombat();
      const combatant = currentCombat.combatants.find((c) => c.id == combId);
      const initMessages = [];

      if (game.user.isGM || combatant.actor.isOwner) {
        if (game.settings.get('demonlord08', 'initMessage')) {
          var templateData = {
            actor: combatant.actor,
            item: {
              name: game.i18n.localize('DL.DialogInitiative'),
            },
            data: {
              turn: {
                value: combatant.actor.data?.data?.fastturn
                  ? game.i18n.localize('DL.DialogTurnSlow')
                  : game.i18n.localize('DL.DialogTurnFast'),
              },
            },
          };

          const chatData = {
            user: game.user.id,
            speaker: {
              actor: combatant.actor.id,
              token: combatant.actor.token,
              alias: combatant.actor.name,
            },
          };

          const template = 'systems/demonlord08/templates/chat/init.html';
          renderTemplate(template, templateData).then((content) => {
            chatData.content = content;
            ChatMessage.create(chatData);
          });
        }

        this.updateActorsFastturn(combatant.actor);
      }
    });

    // Add "End of the Round" to the Combat Tracker
    if (hasEndOfRoundEffects && game.user.isGM) {
      html
        .find('#combat-tracker')
        .append(
          '<li id="combat-endofround" class="combatant actor directory-item flexrow"><img class="token-image" title="Hag" src="systems/demonlord/ui/icons/pentragram.png"/><div class="token-name flexcol"><h4>End of the Round</h4></div></li>',
        );
    }

    html.find('#combat-endofround').click((ev) => {
      new DLEndOfRound(this.getCurrentCombat(), {
        top: 50,
        right: 700,
      }).render(true);
    });
  }

  getCurrentCombat() {
    const combat = this.viewed;
    const combats = combat.scene ? game.combats.contents.filter((c) => c.data.scene === combat.scene.id) : [];
    const currentIdx = combats.findIndex((c) => c === this.viewed);
    return combats[currentIdx];
  }

  async updateActorsFastturn(actor) {
    await actor.update({
      'data.fastturn': !actor.data?.data?.fastturn,
    });

    if (game.combat) {
      for (const combatant of game.combat.combatants) {
        let init = 0;

        if (combatant.actor == actor) {
          if (actor.data.type == 'character') {
            init = actor.data?.data.fastturn ? 70 : 30;
          } else {
            init = actor.data?.data.fastturn ? 50 : 10;
          }

          game.combat.setInitiative(combatant.id, init);
        }
      }
    }
  }
}
